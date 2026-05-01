import type { H3Event } from 'h3'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createMinimax } from 'vercel-minimax-ai-provider'

/** Supported AI model provider names. */
type ProviderName = 'minimax' | 'glm'

/**
 * Parses a model identifier into its provider and model ID components.
 *
 * Model identifiers follow the format `provider/modelId` (e.g., `minimax/MiniMax-M2.7`).
 *
 * @param model - The full model identifier string.
 * @returns An object with `provider` and `modelId`.
 * @throws Throws a 400 error if the provider is unsupported or the model ID is missing.
 */
function splitProviderModel(model: string): { provider: ProviderName, modelId: string } {
  const [provider, ...modelParts] = model.split('/')
  const modelId = modelParts.join('/')

  if ((provider !== 'minimax' && provider !== 'glm') || !modelId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  return { provider, modelId }
}

/**
 * Validates that a runtime secret is present and non-empty.
 *
 * @param value - The runtime config value to check.
 * @param name - The human-readable name used in the error message.
 * @returns The validated string value.
 * @throws Throws a 500 error if the value is missing or empty.
 */
function requireRuntimeSecret(value: unknown, name: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  throw createError({
    statusCode: 500,
    statusMessage: `${name} is not configured`
  })
}

/**
 * Resolves a model identifier into an AI SDK language model instance.
 *
 * Uses the provider prefix in the model identifier to select the correct
 * provider client (MiniMax or GLM) and configures it with the appropriate
 * API key and base URL from runtime config.
 *
 * @param model - The full model identifier (e.g., `minimax/MiniMax-M2.7`).
 * @param event - The H3 event, used to access runtime configuration.
 * @returns A configured language model instance ready for use with the AI SDK.
 */
export function resolveLanguageModel(model: string, event: H3Event) {
  const config = useRuntimeConfig(event)
  const { provider, modelId } = splitProviderModel(model)

  // Configure MiniMax provider
  if (provider === 'minimax') {
    const minimax = createMinimax({
      apiKey: requireRuntimeSecret(config.minimaxApiKey, 'MiniMax API key'),
      baseURL: requireRuntimeSecret(config.minimaxBaseUrl, 'MiniMax base URL')
    })

    return minimax(modelId)
  }

  // Configure GLM (OpenAI-compatible) provider
  const glm = createOpenAICompatible({
    name: 'glm',
    apiKey: requireRuntimeSecret(config.glmApiKey, 'GLM API key'),
    baseURL: requireRuntimeSecret(config.glmBaseUrl, 'GLM base URL').replace(/\/+$/, ''),
    headers: {
      'Accept-Language': 'en-US,en'
    }
  })

  return glm(modelId)
}
