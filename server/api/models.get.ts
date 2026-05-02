import type { H3Event } from 'h3'
import type { ModelId, ModelOption, ModelsResponse } from '#shared/utils/models'
import { MODELS } from '#shared/utils/models'
import { listOllamaModels } from '../utils/ollama'

/**
 * GET /api/models
 *
 * Lists selectable chat models. Static providers are always returned. Ollama
 * models are appended only when the configured Ollama instance is reachable.
 */
export default defineEventHandler(async (event): Promise<ModelsResponse> => {
  const ollamaModels = await getAvailableOllamaModelOptions(event)

  return {
    models: [
      ...MODELS,
      ...ollamaModels
    ]
  }
})

/**
 * Converts available Ollama models into UI model options.
 *
 * Ollama is optional for chat. If it is not configured or unreachable, the
 * model list endpoint should still succeed with static providers.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Runtime-discovered Ollama model options.
 */
async function getAvailableOllamaModelOptions(event: H3Event): Promise<ModelOption[]> {
  try {
    const models = await listOllamaModels(event)

    return models
      .map(model => model.name.trim())
      .filter((name, index, names) => name.length > 0 && names.indexOf(name) === index)
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
