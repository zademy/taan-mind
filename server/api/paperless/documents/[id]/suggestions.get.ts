import { z } from 'zod'

/**
 * GET /api/paperless/documents/:id/suggestions
 *
 * Returns AI-generated suggestions for a document (tags, correspondent, document type, etc.).
 */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.coerce.number().int().positive()
  }).parse)

  const client = usePaperlessClient(event)

  try {
    return await client<Record<string, unknown>>(`/documents/${id}/suggestions/` as string)
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch suggestions from Paperless'
    })
  }
})
