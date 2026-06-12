/**
 * Chat Session — POST /api/chats/:id/stream
 *
 * Streams an AI response for a chat message, handling message generation,
 * tool calls (Chart, Weather), and document context injection.
 *
 * @module server/api/chats
 */

import type { UIMessage } from 'ai'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  smoothStream,
  stepCountIs,
  streamText
} from 'ai'
import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { isSelectableModel } from '#shared/utils/models'
import {
  assertLanguageModelAvailable,
  getLanguageModelProviderOptions,
  resolveLanguageModel
} from '../../utils/aiModels'
import { getAIUserErrorMessage } from '../../utils/aiErrors'
import { normalizeLanguageModelUsage, recordAIUsage } from '../../utils/aiUsage'
import {
  MAX_CHAT_DOCUMENTS,
  assertChatDocumentsAvailable,
  buildChatDocumentContext,
  normalizeChatDocumentIds,
  replaceChatDocuments
} from '../../utils/chatDocuments'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI. Streams responses using the AI SDK UI message protocol.',
    tags: ['ai']
  }
})

/**
 * POST /api/chats/:id
 *
 * Handles AI chat interactions by streaming responses to the client.
 *
 * On the first message, it auto-generates a chat title using a separate AI call.
 * Persists the user's message before streaming and saves the assistant's
 * response once the stream completes.
 *
 * Supports tool calls (chart, weather) with up to 5 reasoning steps.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)

  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string()
    }).parse
  )

  const { model, messages, documentIds } = await readValidatedBody(
    event,
    z.object({
      /** AI model identifier in `provider/modelId` format. */
      model: z.string().refine(isSelectableModel, {
        message: 'Invalid model'
      }),
      /** Array of UI messages in the conversation (including the new user message). */
      messages: z.array(z.custom<UIMessage>()),
      /** Optional Paperless document context selected in an existing chat. */
      documentIds: z.array(z.number().int().positive()).max(MAX_CHAT_DOCUMENTS).optional()
    }).parse
  )

  await assertLanguageModelAvailable(model, event)

  // Verify the chat exists and belongs to the requesting user
  const chat = await db.query.chats.findFirst({
    where: () => and(eq(schema.chats.id, id as string), eq(schema.chats.userId, userId)),
    with: {
      messages: true
    }
  })
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const normalizedDocumentIds = documentIds ? normalizeChatDocumentIds({ documentIds }) : undefined

  if (normalizedDocumentIds) {
    await assertChatDocumentsAvailable(normalizedDocumentIds)
    await replaceChatDocuments(chat.id, normalizedDocumentIds)
  }

  const chatWithDocumentContext = normalizedDocumentIds
    ? { ...chat, documentId: normalizedDocumentIds[0] ?? null }
    : chat

  // Retrieve the personality system prompt for this chat
  const personalityPrompt = await resolvePersonalityPrompt(chat.personality, userId)

  const documentContext = await buildChatDocumentContext(chatWithDocumentContext)

  // Auto-generate a title on the first message if none exists
  if (!chat.title) {
    let title = createFallbackChatTitle(messages[0])

    try {
      const { text, totalUsage, finishReason, response } = await generateText({
        model: resolveLanguageModel(model, event),
        maxRetries: 0,
        providerOptions: getLanguageModelProviderOptions(model),
        system: `You are a title generator for a chat:
          - Generate a short title based on the first user's message
          - The title should be less than 30 characters long
          - The title should be a summary of the user's message
          - Do not use quotes (' or ") or colons (:) or any other punctuation
          - Do not use markdown, just plain text`,
        prompt: JSON.stringify(messages[0])
      })

      await recordAIUsage({
        userId,
        chatId: chat.id,
        model,
        operation: 'chat-title',
        usage: normalizeLanguageModelUsage(totalUsage),
        finishReason,
        providerResponseId: response.id
      })

      title = normalizeChatTitle(text) || title
    } catch (error) {
      console.warn(`[Chat] Title generation failed: ${getAIUserErrorMessage(error)}`)
    }

    await db
      .update(schema.chats)
      .set({ title })
      .where(eq(schema.chats.id, id as string))
  }

  // Persist the latest user message (upsert in case of edit/regenerate)
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'user') {
    await db
      .insert(schema.messages)
      .values({
        id: lastMessage.id,
        chatId: id as string,
        role: 'user',
        parts: lastMessage.parts
      })
      .onConflictDoUpdate({ target: schema.messages.id, set: { parts: lastMessage.parts } })
  }

  // Set up abort handling so the stream stops if the client disconnects
  const abortController = new AbortController()
  event.node.req.on('close', () => abortController.abort())

  const stream = createUIMessageStream({
    onError: error => {
      const message = getAIUserErrorMessage(error)
      console.warn(`[Chat] AI provider error: ${message}`)
      return message
    },
    execute: async ({ writer }) => {
      // Stream the AI response with tool support and reasoning
      const result = streamText({
        abortSignal: abortController.signal,
        model: resolveLanguageModel(model, event),
        providerOptions: getLanguageModelProviderOptions(model, {
          openAIReasoningSummary: 'auto'
        }),
        system: `${documentContext}${personalityPrompt}

**CONTENT POLICY (MANDATORY):**
- Never generate explicit, violent, hateful, or harmful content
- Decline inappropriate requests politely and redirect the conversation
- Protect user privacy — never ask for or store personal sensitive information
- If unsure about content appropriateness, err on the side of caution

**FORMATTING RULES (CRITICAL):**
- ABSOLUTELY NO MARKDOWN HEADINGS: Never use #, ##, ###, ####, #####, or ######
- NO underline-style headings with === or ---
- Use **bold text** for emphasis and section labels instead
- Examples:
  * Instead of "## Usage", write "**Usage:**" or just "Here's how to use it:"
  * Instead of "# Complete Guide", write "**Complete Guide**" or start directly with content
- Start all responses with content, never with a heading

**RESPONSE QUALITY:**
- Be concise yet comprehensive
- Use examples when helpful
- Break down complex topics into digestible parts`,
        messages: await convertToModelMessages(messages),
        tools: {
          chart: chartTool,
          weather: weatherTool
        },
        stopWhen: stepCountIs(5),
        experimental_transform: smoothStream(),
        onFinish: async ({ totalUsage, finishReason, response }) => {
          const usage = normalizeLanguageModelUsage(totalUsage)

          writer.write({
            type: 'data-chat-usage',
            data: {
              usage,
              finishReason
            },
            transient: true
          })

          await recordAIUsage({
            userId,
            chatId: chat.id,
            model,
            operation: 'chat',
            usage,
            finishReason,
            providerResponseId: response.id
          })
        }
      })

      // Notify the client that a title is being generated
      if (!chat.title) {
        writer.write({
          type: 'data-chat-title',
          data: { message: 'Generating title...' },
          transient: true
        })
      }

      // Merge the AI stream into the UI message stream, including sources and reasoning
      writer.merge(
        result.toUIMessageStream({
          sendSources: true,
          sendReasoning: true,
          onError: getAIUserErrorMessage
        })
      )
    },
    // Persist all assistant messages (including tool results) after the stream finishes
    onFinish: async ({ messages }) => {
      await db
        .insert(schema.messages)
        .values(
          messages.map(message => ({
            id: message.id,
            chatId: chat.id,
            role: message.role as 'user' | 'assistant',
            parts: message.parts
          }))
        )
        .onConflictDoNothing()
    }
  })

  return createUIMessageStreamResponse({
    stream
  })
})

function createFallbackChatTitle(message?: UIMessage): string {
  const text = getMessageText(message)
  return normalizeChatTitle(text) || 'New chat'
}

function getMessageText(message?: UIMessage): string {
  return (message?.parts ?? [])
    .map(part => (part.type === 'text' && 'text' in part ? part.text : ''))
    .filter(Boolean)
    .join(' ')
}

function normalizeChatTitle(value: string): string {
  return value
    .replace(/[`*_~#"'’:：]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
    .trim()
}
