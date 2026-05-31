/**
 * AI Model Catalog — GET /api/models
 *
 * Returns all selectable AI models for the current scope.
 * Static catalog (MiniMax, GLM, OpenAI, Nova) is always included.
 * Runtime-discovered models (Ollama, OpenRouter) are appended only
 * when their providers are reachable.
 *
 * Scopes:
 *   - `chat` (default): full model catalog
 *   - `document-processing`: excludes Nova providers
 *
 * @module server/api
 */

import { setResponseHeader, type H3Event } from 'h3'
import type { ModelId, ModelOption, ModelsResponse } from '#shared/utils/models'
import {
  DOCUMENT_PROCESSING_MODELS,
  MODELS,
  isSelectableOllamaModelName,
  isSelectableOpenRouterModelName
} from '#shared/utils/models'
import { listOllamaModels } from '../utils/ollama'
import { listOpenRouterModels, type OpenRouterModel } from '../utils/openrouter'
import { MODEL_LIST_CACHE_TTL_MS, createTtlCache } from '../utils/modelListCache'

type ModelsScope = 'chat' | 'document-processing'

const MODEL_RESPONSE_CACHE_MAX_AGE_SECONDS = Math.floor(MODEL_LIST_CACHE_TTL_MS / 1000)
const modelsResponseCache = createTtlCache<ModelsResponse>()

/**
 * GET /api/models
 *
 * Lists selectable models. Chat scope includes all chat models, while
 * document-processing scope excludes chat-only providers such as Nova. Runtime
 * Ollama/OpenRouter models are appended only when their providers are reachable.
 * OCR-only runtime models are intentionally excluded from this list.
 */
export default defineEventHandler(async (event): Promise<ModelsResponse> => {
  const scope = getModelsScope(event)
  const response = await modelsResponseCache.get(`models:${scope}`, () =>
    buildModelsResponse(event, scope)
  )

  setResponseHeader(
    event,
    'Cache-Control',
    `private, max-age=${MODEL_RESPONSE_CACHE_MAX_AGE_SECONDS}`
  )

  return {
    models: response.models.map(model => ({ ...model }))
  }
})

function getModelsScope(event: H3Event): ModelsScope {
  return getQuery(event).scope === 'document-processing' ? 'document-processing' : 'chat'
}

async function buildModelsResponse(event: H3Event, scope: ModelsScope): Promise<ModelsResponse> {
  const staticModels = scope === 'document-processing' ? DOCUMENT_PROCESSING_MODELS : MODELS
  const [ollamaModels, openRouterModels] = await Promise.all([
    getAvailableOllamaModelOptions(event),
    getAvailableOpenRouterModelOptions(event)
  ])

  return {
    models: [...staticModels, ...ollamaModels, ...openRouterModels]
  }
}

/**
 * Converts available Ollama models into UI model options.
 *
 * Ollama is optional for chat/enrichment. If it is not configured or
 * unreachable, the model list endpoint should still succeed with static
 * providers. OCR-only models stay available through `/api/ocr/models`.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Runtime-discovered Ollama model options.
 */
async function getAvailableOllamaModelOptions(event: H3Event): Promise<ModelOption[]> {
  try {
    const models = await listOllamaModels(event)

    return models
      .map(model => model.name.trim())
      .filter(
        (name, index, names) =>
          name.length > 0 && names.indexOf(name) === index && isSelectableOllamaModelName(name)
      )
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({
        label: `Ollama: ${name}`,
        value: `ollama/${name}` as ModelId,
        icon: 'i-lucide-server-cog',
        provider: 'ollama',
        dynamic: true
      }))
  } catch {
    return []
  }
}

/**
 * Converts available OpenRouter models into UI model options.
 *
 * OpenRouter is optional for chat/enrichment. If it is not configured or
 * unreachable, the model list endpoint still succeeds with static providers.
 * OCR-only OpenRouter models are excluded from chat and document processing.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Runtime-discovered OpenRouter model options.
 */
async function getAvailableOpenRouterModelOptions(event: H3Event): Promise<ModelOption[]> {
  try {
    const models = await listOpenRouterModels(event)

    return models
      .filter(model => isSelectableOpenRouterModel(model))
      .filter(
        (model, index, candidates) =>
          candidates.findIndex(candidate => candidate.id === model.id) === index
      )
      .sort((a, b) => getOpenRouterDisplayName(a).localeCompare(getOpenRouterDisplayName(b)))
      .map(model => ({
        label: `OpenRouter: ${getOpenRouterDisplayName(model)}`,
        value: `openrouter/${model.id}` as ModelId,
        icon: 'i-lucide-route',
        provider: 'openrouter',
        dynamic: true
      }))
  } catch {
    return []
  }
}

function isSelectableOpenRouterModel(model: OpenRouterModel): boolean {
  return (
    model.id.length > 0 &&
    isSelectableOpenRouterModelName(model.id) &&
    isSelectableOpenRouterModelName(model.name ?? '')
  )
}

function getOpenRouterDisplayName(model: OpenRouterModel): string {
  return model.name || model.id
}
