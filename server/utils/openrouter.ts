/**
 * @file OpenRouter API client and model discovery.
 *
 * OpenRouter model identifiers can be deprecated or replaced over time. These
 * helpers query the live Models API so chat and document-enrichment selectors
 * expose current, text-capable models only.
 */
import type { H3Event } from 'h3'
import { createTtlCache } from './modelListCache'

/** Base URL for OpenRouter's OpenAI-compatible API. */
export const OPENROUTER_OPENAI_BASE_URL = 'https://openrouter.ai/api/v1'

/** Model entry returned by OpenRouter's `/api/v1/models` endpoint. */
export interface OpenRouterModel {
  /** Model identifier used in OpenRouter requests, for example `openai/gpt-5.2`. */
  id: string
  /** Human-readable model name. */
  name?: string
  /** Permanent slug for the model. */
  canonical_slug?: string
  /** Model deprecation date. `null` means the model is not deprecated. */
  expiration_date?: string | null
  /** Model architecture metadata. */
  architecture?: {
    /** Supported output modalities, for example `text`. */
    output_modalities?: string[]
  }
}

/** Response returned by OpenRouter's `/api/v1/models` endpoint. */
interface OpenRouterModelsResponse {
  /** Models currently available through OpenRouter. */
  data?: OpenRouterModel[]
}

const openRouterModelsCache = createTtlCache<OpenRouterModel[]>()

/** Runtime config subset required by OpenRouter helpers. */
export interface OpenRouterRuntimeConfig {
  /** OpenRouter API key. */
  openrouterApiKey?: unknown
}

/**
 * Reads the OpenRouter API key from Nuxt runtime config or the server environment.
 *
 * @param config - Runtime configuration containing `openrouterApiKey`.
 * @returns The configured OpenRouter API key.
 * @throws Throws a 500 error if `OPENROUTER_API_KEY` is not configured.
 */
export function getOpenRouterApiKeyFromConfig(config: OpenRouterRuntimeConfig): string {
  const configuredKey = config.openrouterApiKey

  if (typeof configuredKey === 'string' && configuredKey.trim()) {
    return configuredKey.trim()
  }

  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return process.env.OPENROUTER_API_KEY.trim()
  }

  throw createError({ statusCode: 500, statusMessage: 'OpenRouter API key is not configured' })
}

/**
 * Lists active text-output models currently available through OpenRouter.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Available, non-deprecated OpenRouter models.
 */
export async function listOpenRouterModels(event: H3Event): Promise<OpenRouterModel[]> {
  const apiKey = getOpenRouterApiKeyFromConfig(useRuntimeConfig(event))

  return openRouterModelsCache.get('openrouter:models', async () => {
    const response = await $fetch<OpenRouterModelsResponse>('/models', {
      baseURL: OPENROUTER_OPENAI_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      query: {
        output_modalities: 'text'
      }
    })

    return (response.data ?? [])
      .map(model => ({
        ...model,
        id: typeof model.id === 'string' ? model.id.trim() : '',
        name: typeof model.name === 'string' ? model.name.trim() : undefined
      }))
      .filter(isAvailableTextModel)
  })
}

/**
 * Checks if a model ID is currently available in OpenRouter.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @param modelId - The OpenRouter model id without the `openrouter/` prefix.
 * @returns `true` when the model is present in `/api/v1/models`.
 */
export async function hasOpenRouterModel(event: H3Event, modelId: string): Promise<boolean> {
  const models = await listOpenRouterModels(event)
  return models.some(model => model.id === modelId)
}

function isAvailableTextModel(model: OpenRouterModel): model is OpenRouterModel & { id: string } {
  if (!model.id || model.expiration_date) {
    return false
  }

  const outputModalities = model.architecture?.output_modalities
  return !outputModalities || outputModalities.includes('text')
}
