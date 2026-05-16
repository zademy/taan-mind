import type { InlineAIActionId } from '#shared/utils/inlineAi'

export type InlineAIRewriteStatus = 'idle' | 'streaming' | 'ready' | 'error'

interface RunInlineAIRewriteOptions {
  action: InlineAIActionId
  text: string
  model: string
  documentIds?: number[]
}

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

  function acceptDraft() {
    const value = draft.value.trim()
    reset()
    return value
  }

  function cancel() {
    abortController?.abort()
    reset()
  }

  function reset() {
    abortController?.abort()
    status.value = 'idle'
    original.value = ''
    draft.value = ''
    activeAction.value = null
    error.value = null
  }

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

function getRandomLoadingMessage() {
  return INLINE_AI_LOADING_MESSAGES[Math.floor(Math.random() * INLINE_AI_LOADING_MESSAGES.length)]!
}

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
