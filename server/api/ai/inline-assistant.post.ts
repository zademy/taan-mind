import { smoothStream, streamText } from 'ai'
import { z } from 'zod'
import { INLINE_AI_MAX_INPUT_CHARACTERS, isInlineAIActionId } from '#shared/utils/inlineAi'
import type { InlineAIActionId } from '#shared/utils/inlineAi'
import { isSelectableModel } from '#shared/utils/models'
import { getAIUserErrorMessage } from '../../utils/aiErrors'
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
  // Ensures the anonymous session cookie exists before any provider request.
  getChatUserId(event)

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
      onFinish: ({ finishReason, totalUsage }) => {
        console.info('[InlineAI] generation completed', {
          action: inlineAction,
          model,
          finishReason,
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          totalTokens: totalUsage.totalTokens
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
