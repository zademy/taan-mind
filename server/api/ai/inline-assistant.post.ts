/**
 * Inline AI Assistant — Streaming Rewrite Endpoint
 *
 * Receives an inline AI action (rewrite, summarize, document intelligence, etc.)
 * and streams back an AI-generated text transformation via the AI SDK `streamText`.
 *
 * Pipeline:
 *   1. Validate CSRF and authenticate the user
 *   2. Validate action ID, model ID, and text length (max {@link INLINE_AI_MAX_INPUT_CHARACTERS})
 *   3. Optionally resolve up to {@link MAX_CHAT_DOCUMENTS} Paperless documents as context
 *   4. Build the system prompt and action prompt from {@link inlineAssistant} utilities
 *   5. Stream the model's text response with `smoothStream` transformation
 *   6. Log token usage on finish
 *
 * The response is a raw text stream (`text/event-stream` or `application/octet-stream`),
 * consumed by {@link useInlineAIRewrite} in the UI.
 *
 * @module server/api/ai
 */
import { smoothStream, streamText } from 'ai'
import { z } from 'zod'
import { INLINE_AI_MAX_INPUT_CHARACTERS, isInlineAIActionId } from '#shared/utils/inlineAi'
import type { InlineAIActionId } from '#shared/utils/inlineAi'
import { isSelectableModel } from '#shared/utils/models'
import { getAIUserErrorMessage } from '../../utils/aiErrors'
import { normalizeLanguageModelUsage, recordAIUsage } from '../../utils/aiUsage'
import {
  assertLanguageModelAvailable,
  getLanguageModelProviderOptions,
  resolveLanguageModel
} from '../../utils/aiModels'
import {
  MAX_CHAT_DOCUMENTS,
  assertChatDocumentsAvailable,
  buildDocumentContextFromIds,
  normalizeChatDocumentIds
} from '../../utils/chatDocuments'
import {
  buildInlineAssistantPrompt,
  buildInlineAssistantSystemPrompt
} from '../../utils/inlineAssistant'

defineRouteMeta({
  openAPI: {
    description: 'Stream an inline AI rewrite or document-intelligence transformation.',
    tags: ['ai']
  }
})

/**
 * Request body schema for the inline assistant endpoint.
 *
 * Fields:
 *   - `model`      — must pass {@link isSelectableModel}
 *   - `action`     — must pass {@link isInlineAIActionId}
 *   - `text`       — trimmed, 1..MAX characters
 *   - `documentIds` — optional array of cached Paperless doc IDs (max MAX_CHAT_DOCUMENTS)
 */
const inlineAssistantBodySchema = z.object({
  model: z.string().refine(isSelectableModel, {
    message: 'Invalid model'
  }),
  action: z.string().refine(isInlineAIActionId, {
    message: 'Invalid inline AI action'
  }),
  text: z.string().trim().min(1).max(INLINE_AI_MAX_INPUT_CHARACTERS),
  documentIds: z.array(z.number().int().positive()).max(MAX_CHAT_DOCUMENTS).optional()
})

export default defineEventHandler(async event => {
  // Requires an authenticated user before any provider request.
  const userId = getChatUserId(event)

  const { model, action, text, documentIds } = await readValidatedBody(
    event,
    inlineAssistantBodySchema.parse
  )
  const inlineAction = action as InlineAIActionId
  const normalizedDocumentIds = normalizeChatDocumentIds({ documentIds })

  await assertLanguageModelAvailable(model, event)
  await assertChatDocumentsAvailable(normalizedDocumentIds)

  const documentContext = await buildDocumentContextFromIds(normalizedDocumentIds)
  const abortController = new AbortController()

  event.node.req.on('close', () => abortController.abort())

  try {
    const result = streamText({
      abortSignal: abortController.signal,
      model: resolveLanguageModel(model, event),
      maxRetries: 0,
      providerOptions: getLanguageModelProviderOptions(model, {
        openAIReasoningSummary: 'auto'
      }),
      system: buildInlineAssistantSystemPrompt(),
      prompt: buildInlineAssistantPrompt({
        action: inlineAction,
        text,
        documentContext
      }),
      experimental_transform: smoothStream(),
      onFinish: async ({ finishReason, totalUsage, response }) => {
        const usage = normalizeLanguageModelUsage(totalUsage)

        console.info('[InlineAI] generation completed', {
          action: inlineAction,
          model,
          finishReason,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens
        })

        await recordAIUsage({
          userId,
          model,
          operation: 'inline-assistant',
          usage,
          finishReason,
          providerResponseId: response.id
        })
      }
    })

    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: getAIUserErrorMessage(error)
    })
  }
})
