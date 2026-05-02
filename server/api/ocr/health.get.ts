import { listOllamaModels } from '../../utils/ollama'

/**
 * GET /api/ocr/health
 *
 * Checks whether the Ollama OCR service is reachable and the configured
 * model is available. Returns status, model name, and availability flag.
 */
export default defineEventHandler(async (event) => {
  try {
    const model = getOcrModel(event)
    const models = await listOllamaModels(event)
    const modelBase = model.split(':')[0]!
    const available = models.some(m => m.name === model || m.name.startsWith(modelBase))
    return { status: 'ok' as const, model, available }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ollama not reachable'
    return { status: 'error' as const, model: '', available: false, message }
  }
})
