import type { UIMessage } from 'ai'
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText, smoothStream, stepCountIs, streamText } from 'ai'
import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { isSupportedModel } from '#shared/utils/models'
import { assertLanguageModelAvailable, resolveLanguageModel } from '../../utils/aiModels'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI.',
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
export default defineEventHandler(async (event) => {
  const userId = getChatUserId(event)

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const { model, messages } = await readValidatedBody(event, z.object({
    model: z.string().refine(isSupportedModel, {
      message: 'Invalid model'
    }),
    messages: z.array(z.custom<UIMessage>())
  }).parse)

  await assertLanguageModelAvailable(model, event)

  // Verify the chat exists and belongs to the requesting user
  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id as string),
      eq(schema.chats.userId, userId)
    ),
    with: {
      messages: true
    }
  })
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  // Retrieve the personality system prompt for this chat
  const personalityPrompt = getPersonalityPrompt(chat.personality as PersonalityId)

  let documentContext = ''
  const chatDocumentId = (chat as unknown as { documentId: number | null }).documentId
  if (chatDocumentId) {
    const doc = await db.query.paperlessDocuments.findFirst({
      where: () => eq(schema.paperlessDocuments.id, chatDocumentId)
    })
    if (doc) {
      documentContext = `**DOCUMENT CONTEXT (reference material for this conversation):**
Title: ${doc.title}
${doc.correspondent ? `Correspondent: ${doc.correspondent}` : ''}
${doc.documentType ? `Document Type: ${doc.documentType}` : ''}
Content:
${doc.aiContent || doc.ocrContent || 'No content available'}
---

`
    }
  }

  // Auto-generate a title on the first message if none exists
  if (!chat.title) {
    const { text: title } = await generateText({
      model: resolveLanguageModel(model, event),
      system: `You are a title generator for a chat:
          - Generate a short title based on the first user's message
          - The title should be less than 30 characters long
          - The title should be a summary of the user's message
          - Do not use quotes (' or ") or colons (:) or any other punctuation
          - Do not use markdown, just plain text`,
      prompt: JSON.stringify(messages[0])
    })

    await db.update(schema.chats).set({ title }).where(eq(schema.chats.id, id as string))
  }

  // Persist the latest user message (upsert in case of edit/regenerate)
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'user' && messages.length > 1) {
    await db.insert(schema.messages).values({
      id: lastMessage.id,
      chatId: id as string,
      role: 'user',
      parts: lastMessage.parts
    }).onConflictDoUpdate({ target: schema.messages.id, set: { parts: lastMessage.parts } })
  }

  // Set up abort handling so the stream stops if the client disconnects
  const abortController = new AbortController()
  event.node.req.on('close', () => abortController.abort())

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Stream the AI response with tool support and reasoning
      const result = streamText({
        abortSignal: abortController.signal,
        model: resolveLanguageModel(model, event),
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
        experimental_transform: smoothStream()
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
      writer.merge(result.toUIMessageStream({
        sendSources: true,
        sendReasoning: true
      }))
    },
    // Persist all assistant messages (including tool results) after the stream finishes
    onFinish: async ({ messages }) => {
      await db.insert(schema.messages).values(messages.map(message => ({
        id: message.id,
        chatId: chat.id,
        role: message.role as 'user' | 'assistant',
        parts: message.parts
      }))).onConflictDoNothing()
    }
  })

  return createUIMessageStreamResponse({
    stream
  })
})
