import type { ModelId, ModelsResponse } from '#shared/utils/models'
import { DEFAULT_MODEL, MODELS, isSupportedModel } from '#shared/utils/models'

/**
 * Composable that manages the selected AI model.
 *
 * Persists the model selection in a cookie so it survives page reloads.
 * Loads runtime-discovered provider models and falls back to the default model
 * if the stored value is no longer available.
 *
 * @returns An object containing the available `models` list and the reactive `model` selection.
 */
export function useModels() {
  /** Currently selected model, persisted as a cookie. */
  const model = useCookie<ModelId>('model', { default: () => DEFAULT_MODEL })

  const { data, error, refresh, status } = useLazyFetch<ModelsResponse>('/api/models', {
    default: () => ({ models: MODELS })
  })

  const models = computed(() => {
    const availableModels = data.value?.models ?? []
    return availableModels.length > 0 ? availableModels : MODELS
  })

  const selectedModel = computed(() => models.value.find(option => option.value === model.value))

  // Reset immediately only when the cookie does not match any supported model ID shape.
  if (!isSupportedModel(model.value as string)) {
    model.value = DEFAULT_MODEL
  }

  // Runtime models are loaded asynchronously; wait for the API result before
  // deciding that a previously selected Ollama model is unavailable.
  watch([models, status], () => {
    if (status.value !== 'success') {
      return
    }

    if (!models.value.some(option => option.value === model.value)) {
      model.value = DEFAULT_MODEL
    }
  }, { immediate: true })

  return {
    error,
    model,
    models,
    refresh,
    selectedModel,
    status
  }
}
