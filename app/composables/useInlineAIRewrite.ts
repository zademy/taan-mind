/**
 * Inline AI Rewrite Composable
 *
 * Manages the lifecycle of an inline AI rewrite operation:
 *   - streaming the AI suggestion from `/api/ai/inline-assistant`
 *   - comparing the original text against the streamed draft
 *   - accepting, retrying, or canceling the rewrite
 *
 * The composable owns the HTTP request, AbortController, and state machine.
 * UI components (`InlineAssistant`, `StreamingRewrite`) consume the returned
 * reactive refs and action handlers.
 *
 * State machine: idle → streaming → ready | error → idle (via reset/accept/cancel)
 *
 * @module app/composables
 */
import type { InlineAIActionId } from '#shared/utils/inlineAi'

/** Current state of an inline rewrite operation. */
export type InlineAIRewriteStatus = 'idle' | 'streaming' | 'ready' | 'error'

/**
 * Options passed to {@link run} to trigger an inline AI rewrite.
 */
interface RunInlineAIRewriteOptions {
  /** The action to perform (e.g., rewrite, summarize, extract-entities). */
  action: InlineAIActionId
  /** User-supplied text to be rewritten or transformed. */
  text: string
  /** AI model ID to use (e.g., `minimax/MiniMax-M2.7`). */
  model: string
  /**
   * Optional Paperless document IDs to inject as context.
   * The inline assistant will see the document content alongside the action prompt.
   */
  documentIds?: number[]
}

/** Rotating messages shown while waiting for the streaming response. */
const INLINE_AI_LOADING_MESSAGES = [
  'Reading semantic structures...',
  'Compressing document context...',
  'Extracting relevant entities...',
  'Connecting knowledge fragments...',
  'Rebuilding contextual meaning...',
  'Enhancing readability...'
]

export function useInlineAIRewrite() {
  const { csrf, headerName } = useCsrf()
  const status = shallowRef<InlineAIRewriteStatus>('idle')
  const original = shallowRef('')
  const draft = shallowRef('')
  const activeAction = shallowRef<InlineAIActionId | null>(null)
  const loadingMessage = shallowRef(INLINE_AI_LOADING_MESSAGES[0]!)
  const error = shallowRef<string | null>(null)
  let abortController: AbortController | null = null

  const isBusy = computed(() => status.value === 'streaming')
  const hasDraft = computed(() => draft.value.trim().length > 0)

  /**
   * Triggers a new inline AI rewrite operation.
   *
   * Aborts any in-flight operation before starting.
   * On success, sets `status` to `'ready'` with the draft text in `draft`.
   * On error, sets `status` to `'error'` with a user-safe message in `error`.
   *
   * @param options - Action, text, model, and optional document IDs
   */
  async function run(options: RunInlineAIRewriteOptions) {
    const text = options.text.trim()
    if (!text || status.value === 'streaming') return

    reset()
    abortController = new AbortController()
    status.value = 'streaming'
    original.value = options.text
    activeAction.value = options.action
    loadingMessage.value = getRandomLoadingMessage()

    try {
      const response = await fetch('/api/ai/inline-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [headerName]: csrf
        },
        body: JSON.stringify({
          action: options.action,
          text,
          model: options.model,
          documentIds: options.documentIds ?? []
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response))
      }

      await readTextStream(response)

      if (!draft.value.trim()) {
        throw new Error('The assistant returned an empty suggestion.')
      }

      status.value = 'ready'
    } catch (cause) {
      if (abortController.signal.aborted) {
        reset()
        return
      }

      error.value = cause instanceof Error ? cause.message : 'Inline AI failed.'
      status.value = 'error'
    } finally {
      abortController = null
    }
  }

  /**
   * Accepts the current draft and returns it to the caller.
   * Then resets the composable to idle so the prompt input can apply the result.
   *
   * @returns The trimmed draft text, ready to replace the original prompt.
   */
  function acceptDraft() {
    const value = draft.value.trim()
    reset()
    return value
  }

  /**
   * Cancels the in-flight streaming operation and resets to idle.
   * No draft is returned; the original text is preserved.
   */
  function cancel() {
    abortController?.abort()
    reset()
  }

  /**
   * Resets all reactive state to initial values.
   * Called implicitly by `acceptDraft`, `cancel`, and after abort signals.
   */
  function reset() {
    abortController?.abort()
    status.value = 'idle'
    original.value = ''
    draft.value = ''
    activeAction.value = null
    error.value = null
  }

  /**
   * Reads a streaming fetch Response and accumulates the body into `draft`.
   *
   * Handles both plain text responses (non-streaming fallback) and
   * `ReadableStream` responses from the AI SDK text stream.
   */
  async function readTextStream(response: Response) {
    if (!response.body) {
      draft.value = await response.text()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        draft.value += decoder.decode(value, { stream: true })
      }

      draft.value += decoder.decode()
    } finally {
      reader.releaseLock()
    }
  }

  return {
    status: readonly(status),
    original: readonly(original),
    draft: readonly(draft),
    activeAction: readonly(activeAction),
    loadingMessage: readonly(loadingMessage),
    error: readonly(error),
    isBusy,
    hasDraft,
    run,
    acceptDraft,
    cancel,
    reset
  }
}

/**
 * Picks a random loading message for the AI spinner.
 */
function getRandomLoadingMessage() {
  return INLINE_AI_LOADING_MESSAGES[Math.floor(Math.random() * INLINE_AI_LOADING_MESSAGES.length)]!
}

/**
 * Extracts a user-safe error message from a failed fetch Response.
 *
 * Tries to parse structured H3 error payloads first (Nuxt error format),
 * then falls back to raw response text.
 *
 * @returns A human-readable error string, never throws.
 */
async function getResponseErrorMessage(response: Response) {
  try {
    const payload = (await response.clone().json()) as {
      message?: string
      statusMessage?: string
      data?: { message?: string; statusMessage?: string }
    }

    return (
      payload.data?.message ||
      payload.data?.statusMessage ||
      payload.message ||
      payload.statusMessage ||
      'Inline AI failed.'
    )
  } catch {
    return (await response.text()) || 'Inline AI failed.'
  }
}
