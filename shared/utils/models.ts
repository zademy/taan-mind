/** Supported AI model provider names. */
export type ModelProvider = 'minimax' | 'glm' | 'ollama'

/** Union of all statically configured model identifiers in `provider/modelId` format. */
export type StaticModelId = 'minimax/MiniMax-M2.7' | 'glm/glm-5' | 'glm/glm-5.1' | 'glm/glm-5-turbo'

/** Dynamic Ollama model identifier in `ollama/modelName` format. */
export type OllamaModelId = `ollama/${string}`

/** Union of all supported model identifiers in `provider/modelId` format. */
export type ModelId = StaticModelId | OllamaModelId

/** Represents a selectable model option in the UI. */
export interface ModelOption {
  /** Human-readable display name. */
  label: string
  /** Unique model identifier in `provider/modelId` format. */
  value: ModelId
  /** Lucide icon class for the model. */
  icon: string
  /** Provider that serves this model. */
  provider: ModelProvider
  /** Whether the model was discovered at runtime instead of configured statically. */
  dynamic?: boolean
}

/** Response returned by the model listing API. */
export interface ModelsResponse {
  /** Models currently selectable by the user. */
  models: ModelOption[]
}

/** All available AI models selectable by the user. */
export const MODELS: ModelOption[] = [
  {
    label: 'MiniMax M2.7',
    value: 'minimax/MiniMax-M2.7',
    icon: 'i-lucide-brain-circuit',
    provider: 'minimax'
  },
  { label: 'GLM 5', value: 'glm/glm-5', icon: 'i-lucide-sparkles', provider: 'glm' },
  { label: 'GLM 5.1', value: 'glm/glm-5.1', icon: 'i-lucide-sparkles', provider: 'glm' },
  { label: 'GLM 5 Turbo', value: 'glm/glm-5-turbo', icon: 'i-lucide-bot', provider: 'glm' }
]

/** The default model used when no selection has been made. */
export const DEFAULT_MODEL = MODELS[0]!.value

/**
 * Type guard that checks whether a string is a statically configured model ID.
 *
 * @param value - The string to check.
 * @returns `true` if the value matches a static model ID.
 */
export function isStaticModel(value: string): value is StaticModelId {
  return MODELS.some(model => model.value === value)
}

/**
 * Type guard that checks whether a string has the dynamic Ollama model ID shape.
 *
 * @param value - The string to check.
 * @returns `true` if the value uses `ollama/<modelName>` with a non-empty model name.
 */
export function isOllamaModel(value: string): value is OllamaModelId {
  const [provider, ...modelParts] = value.split('/')
  return provider === 'ollama' && modelParts.join('/').trim().length > 0
}

/**
 * Type guard that checks whether a string has a supported model ID shape.
 *
 * Runtime-discovered models still need server-side availability validation
 * before use because Ollama models can be added or removed while the app runs.
 *
 * @param value - The string to check.
 * @returns `true` if the value is a static model ID or a dynamic Ollama model ID.
 */
export function isSupportedModel(value: string): value is ModelId {
  return isStaticModel(value) || isOllamaModel(value)
}
