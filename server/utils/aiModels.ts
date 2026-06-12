/**
 * @file AI model resolution and availability validation.
 *
 * Maps model identifiers (e.g., `minimax/MiniMax-M2.7`) to AI SDK language model
 * instances by selecting the appropriate provider client with credentials from runtime config.
 * Also validates that runtime-discovered models exist since Ollama/OpenRouter models can be
 * added, removed, or deprecated while the application runs.
 */
import type { H3Event } from 'h3'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createMinimax } from 'vercel-minimax-ai-provider'
import type { ModelProvider } from '#shared/utils/models'
import {
  isNovaReasoningModel,
  isOpenAIReasoningModel,
  isSelectableModel,
  isStaticModel
} from '#shared/utils/models'
import {
  getOllamaOpenAIBaseUrlFromConfig,
  hasOllamaModel,
  type OllamaRuntimeConfig
} from './ollama'
import {
  hasOpenRouterModel,
  OPENROUTER_OPENAI_BASE_URL,
  type OpenRouterRuntimeConfig
} from './openrouter'
import { stripTrailingSlash } from './url'

/** Supported AI model provider names. */
type ProviderName = ModelProvider
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type LanguageModelProviderOptions = Record<string, { [key: string]: JsonValue | undefined }>
type OpenAIReasoningSummary = 'auto' | 'detailed'

interface LanguageModelProviderOptionsConfig {
  /**
   * Ask OpenAI Responses models to stream/return a reasoning summary.
   * Use this only where the client consumes reasoning parts, such as chat UI.
   */
  openAIReasoningSummary?: OpenAIReasoningSummary
}

const SUPPORTED_PROVIDERS: ProviderName[] = [
  'minimax',
  'glm',
  'anthropic',
  'openai',
  'nova',
  'ollama',
  'openrouter'
]

const DEFAULT_NOVA_BASE_URL = 'https://api.nova.amazon.com/v1'
const DEFAULT_OPENAI_REASONING_EFFORT = 'medium'

/** Runtime config subset required to resolve supported language models. */
export interface LanguageModelRuntimeConfig extends OllamaRuntimeConfig, OpenRouterRuntimeConfig {
  /** MiniMax API key. */
  minimaxApiKey?: unknown
  /** Optional custom MiniMax base URL. */
  minimaxBaseUrl?: unknown
  /** GLM API key. */
  glmApiKey?: unknown
  /** GLM OpenAI-compatible base URL. */
  glmBaseUrl?: unknown
  /** Anthropic API key for Claude models. */
  anthropicApiKey?: unknown
  /** Optional Anthropic API base URL override. */
  anthropicBaseUrl?: unknown
  /** OpenAI API key. */
  openaiApiKey?: unknown
  /** Nova API key. */
  novaApiKey?: unknown
  /** Nova OpenAI-compatible base URL. */
  novaBaseUrl?: unknown
  /** OpenRouter API key. */
  openrouterApiKey?: unknown
}

/**
 * Parses a model identifier into its provider and model ID components.
 *
 * Model identifiers follow the format `provider/modelId` (e.g., `minimax/MiniMax-M2.7`).
 *
 * @param model - The full model identifier string.
 * @returns An object with `provider` and `modelId`.
 * @throws Throws a 400 error if the provider is unsupported or the model ID is missing.
 */
function splitProviderModel(model: string): { provider: ProviderName; modelId: string } {
  const [provider, ...modelParts] = model.split('/')
  const modelId = modelParts.join('/')

  if (!SUPPORTED_PROVIDERS.includes(provider as ProviderName) || !modelId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  return { provider: provider as ProviderName, modelId }
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

function getRuntimeString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return undefined
}

/**
 * Resolves a model identifier into an AI SDK language model instance.
 *
 * Uses the provider prefix in the model identifier to select the correct
 * provider client (MiniMax, GLM, Anthropic, OpenAI, Nova, OpenRouter, or Ollama) and
 * configures it with the appropriate API key and base URL from runtime config.
 *
 * @param model - The full model identifier (e.g., `minimax/MiniMax-M2.7`).
 * @param event - The H3 event, used to access runtime configuration.
 * @returns A configured language model instance ready for use with the AI SDK.
 */
export function resolveLanguageModel(model: string, event: H3Event) {
  return resolveLanguageModelFromConfig(model, useRuntimeConfig(event))
}

/**
 * Resolves a model identifier into an AI SDK language model instance from a
 * runtime config object.
 *
 * Use this when no H3 event exists, such as Nitro background plugins.
 *
 * @param model - The full model identifier (e.g., `minimax/MiniMax-M2.7`).
 * @param config - Runtime configuration with provider credentials.
 * @returns A configured language model instance ready for use with the AI SDK.
 */
export function resolveLanguageModelFromConfig(model: string, config: LanguageModelRuntimeConfig) {
  if (!isSelectableModel(model)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

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
  if (provider === 'glm') {
    const glm = createOpenAICompatible({
      name: 'glm',
      apiKey: requireRuntimeSecret(config.glmApiKey, 'GLM API key'),
      baseURL: stripTrailingSlash(requireRuntimeSecret(config.glmBaseUrl, 'GLM base URL')),
      headers: {
        'Accept-Language': 'en-US,en'
      }
    })

    return glm(modelId)
  }

  // Configure Anthropic Claude provider
  if (provider === 'anthropic') {
    const anthropicBaseUrl =
      getRuntimeString(config.anthropicBaseUrl) ?? process.env.ANTHROPIC_BASE_URL
    const anthropic = createAnthropic({
      apiKey: requireRuntimeSecret(
        getRuntimeString(config.anthropicApiKey) ?? process.env.ANTHROPIC_API_KEY,
        'Anthropic API key'
      ),
      ...(anthropicBaseUrl ? { baseURL: stripTrailingSlash(anthropicBaseUrl) } : {})
    })

    return anthropic(modelId)
  }

  // Configure OpenAI provider through the Responses API for streaming/reasoning support
  if (provider === 'openai') {
    const openai = createOpenAI({
      apiKey: requireRuntimeSecret(
        getRuntimeString(config.openaiApiKey) ?? process.env.OPENAI_API_KEY,
        'OpenAI API key'
      )
    })

    return openai.responses(modelId)
  }

  // Configure Nova (OpenAI-compatible) provider
  if (provider === 'nova') {
    const nova = createOpenAICompatible({
      name: 'nova',
      apiKey: requireRuntimeSecret(
        getRuntimeString(config.novaApiKey) ?? process.env.NOVA_API_KEY,
        'Nova API key'
      ),
      baseURL: stripTrailingSlash(
        getRuntimeString(config.novaBaseUrl) ?? process.env.NOVA_BASE_URL ?? DEFAULT_NOVA_BASE_URL
      )
    })

    return nova(modelId)
  }

  // Configure OpenRouter (OpenAI-compatible) provider
  if (provider === 'openrouter') {
    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      apiKey: requireRuntimeSecret(
        getRuntimeString(config.openrouterApiKey) ?? process.env.OPENROUTER_API_KEY,
        'OpenRouter API key'
      ),
      baseURL: OPENROUTER_OPENAI_BASE_URL,
      includeUsage: true
    })

    return openrouter(modelId)
  }

  // Configure Ollama (OpenAI-compatible) provider
  const ollama = createOpenAICompatible({
    name: 'ollama',
    apiKey: 'ollama',
    baseURL: getOllamaOpenAIBaseUrlFromConfig(config),
    includeUsage: true
  })

  return ollama(modelId)
}

/**
 * Returns provider-specific options for chat generation.
 *
 * Nova exposes OpenAI-compatible extended reasoning through `reasoning_effort`,
 * but only reasoning-capable Nova models accept that field. The AI SDK
 * OpenAI-compatible adapter maps `reasoningEffort` to `reasoning_effort`.
 *
 * @param model - The full model identifier.
 * @returns Provider options to pass into AI SDK generation calls.
 */
export function getLanguageModelProviderOptions(
  model: string,
  options: LanguageModelProviderOptionsConfig = {}
): LanguageModelProviderOptions | undefined {
  if (isNovaReasoningModel(model)) {
    return {
      nova: {
        reasoningEffort: 'high'
      }
    }
  }

  if (isOpenAIReasoningModel(model)) {
    return {
      openai: {
        reasoningEffort: DEFAULT_OPENAI_REASONING_EFFORT,
        reasoningSummary: options.openAIReasoningSummary
      }
    }
  }

  return undefined
}

/**
 * Validates that a language model can be used for chat.
 *
 * Static provider models are validated against the shared static registry.
 * Runtime-discovered models are validated against their live model-list APIs
 * because local Ollama models can be removed and OpenRouter models can be deprecated.
 *
 * @param model - The full model identifier (for example `ollama/llama3.2:latest`).
 * @param event - The H3 event, used to access runtime configuration.
 */
export async function assertLanguageModelAvailable(model: string, event: H3Event): Promise<void> {
  if (!isSelectableModel(model)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  if (isStaticModel(model)) {
    return
  }

  const { provider, modelId } = splitProviderModel(model)

  if (provider === 'ollama') {
    try {
      if (await hasOllamaModel(event, modelId)) {
        return
      }
    } catch {
      throw createError({
        statusCode: 503,
        statusMessage: 'Ollama is not available'
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Ollama model is not available: ${modelId}`
    })
  }

  if (provider === 'openrouter') {
    try {
      if (await hasOpenRouterModel(event, modelId)) {
        return
      }
    } catch {
      throw createError({
        statusCode: 503,
        statusMessage: 'OpenRouter is not available'
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: `OpenRouter model is not available: ${modelId}`
    })
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unsupported model: ${model}`
  })
}
