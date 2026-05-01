/** Supported AI model provider names. */
export type ModelProvider = 'minimax' | 'glm'

/** Union of all supported model identifiers in `provider/modelId` format. */
export type ModelId
  = | 'minimax/MiniMax-M2.7'
    | 'glm/glm-5'
    | 'glm/glm-5.1'
    | 'glm/glm-5-turbo'

/** Represents a selectable model option in the UI. */
export interface ModelOption {
  /** Human-readable display name. */
  label: string
  /** Unique model identifier in `provider/modelId` format. */
  value: ModelId
  /** Lucide icon class for the model. */
  icon: string
}

/** All available AI models selectable by the user. */
export const MODELS: ModelOption[] = [
  { label: 'MiniMax M2.7', value: 'minimax/MiniMax-M2.7', icon: 'i-lucide-brain-circuit' },
  { label: 'GLM 5', value: 'glm/glm-5', icon: 'i-lucide-sparkles' },
  { label: 'GLM 5.1', value: 'glm/glm-5.1', icon: 'i-lucide-sparkles' },
  { label: 'GLM 5 Turbo', value: 'glm/glm-5-turbo', icon: 'i-lucide-bot' }
]

/** The default model used when no selection has been made. */
export const DEFAULT_MODEL = MODELS[0]!.value

/**
 * Type guard that checks whether a string is a valid supported model ID.
 *
 * @param value - The string to check.
 * @returns `true` if the value matches a supported model ID.
 */
export function isSupportedModel(value: string): value is ModelId {
  return MODELS.some(model => model.value === value)
}
