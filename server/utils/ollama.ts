import type { H3Event } from 'h3'

/** Model entry returned by Ollama's `/api/tags` endpoint. */
export interface OllamaModel {
  /** Model name, usually including a tag (for example `llama3.2:latest`). */
  name: string
  /** Alternate model name field returned by newer Ollama responses. */
  model?: string
  /** Model file size in bytes. */
  size?: number
  /** Model digest. */
  digest?: string
  /** ISO 8601 timestamp of when the model was last modified. */
  modified_at?: string
}

/** Response returned by Ollama's `/api/tags` endpoint. */
interface OllamaTagsResponse {
  /** Models available in the Ollama instance. */
  models?: OllamaModel[]
}

/**
 * Returns the configured Ollama base URL.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns The configured Ollama base URL.
 * @throws Throws a 500 error if `NUXT_OLLAMA_BASE_URL` is not set.
 */
export function getOllamaBaseUrl(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const baseURL = config.ollamaBaseUrl

  if (typeof baseURL === 'string' && baseURL.trim()) {
    return baseURL.trim().replace(/\/+$/, '')
  }

  throw createError({ statusCode: 500, statusMessage: 'NUXT_OLLAMA_BASE_URL is not configured' })
}

/**
 * Creates a pre-configured `$fetch` instance for native Ollama API calls.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns A `$fetch` instance scoped to the Ollama base URL.
 */
export function useOllamaClient(event: H3Event) {
  return $fetch.create({ baseURL: getOllamaBaseUrl(event) })
}

/**
 * Returns the OpenAI-compatible base URL exposed by Ollama.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns The `/v1` base URL for Ollama's OpenAI-compatible API.
 */
export function getOllamaOpenAIBaseUrl(event: H3Event): string {
  return `${getOllamaBaseUrl(event)}/v1`
}

/**
 * Lists models currently available in Ollama.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Available Ollama models with normalized names.
 */
export async function listOllamaModels(event: H3Event): Promise<OllamaModel[]> {
  const tags = await useOllamaClient(event)<OllamaTagsResponse>('/api/tags')

  return (tags.models ?? [])
    .map(model => {
      const name = model.name || model.model || ''
      return { ...model, name }
    })
    .filter((model): model is OllamaModel => model.name.trim().length > 0)
}

/**
 * Checks if a model name is currently available in Ollama.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @param modelName - The Ollama model name without the `ollama/` prefix.
 * @returns `true` when the model is present in `/api/tags`.
 */
export async function hasOllamaModel(event: H3Event, modelName: string): Promise<boolean> {
  const models = await listOllamaModels(event)
  return models.some(model => model.name === modelName)
}
