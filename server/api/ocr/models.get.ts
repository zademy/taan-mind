/**
 * GET /api/ocr/models
 *
 * Lists all models available in the Ollama instance.
 * Proxies the response directly from the Ollama `/api/tags` endpoint.
 */
export default defineEventHandler(async (event) => {
  const client = useOcrClient(event)
  const tags = await client<{ models: Array<{ name: string, size: number, modified_at: string }> }>('/api/tags')
  return tags
})
