import type { ModelId } from '#shared/utils/models'
import { DEFAULT_MODEL, MODELS, isSupportedModel } from '#shared/utils/models'

/**
 * Composable that manages the selected AI model.
 *
 * Persists the model selection in a cookie so it survives page reloads.
 * Falls back to the default model if the stored value is no longer supported.
 *
 * @returns An object containing the available `models` list and the reactive `model` selection.
 */
export function useModels() {
  /** Currently selected model, persisted as a cookie. */
  const model = useCookie<ModelId>('model', { default: () => DEFAULT_MODEL })

  // Reset to default if the stored model is no longer in the supported list
  if (!isSupportedModel(model.value as string)) {
    model.value = DEFAULT_MODEL
  }

  return {
    models: MODELS,
    model
  }
}
