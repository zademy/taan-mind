import { listOllamaModels } from '../../utils/ollama'

/**
 * GET /api/ocr/models
 *
 * Lists all models available in the Ollama instance.
 * Proxies the response directly from the Ollama `/api/tags` endpoint.
 *
 * @module server/api/ocr
 */
export default defineEventHandler(async event => {
  const models = await listOllamaModels(event)

  return {
    models: models.map(model => ({
      name: model.name,
      size: model.size ?? 0,
      modified_at: model.modified_at ?? ''
    }))
  }
})
