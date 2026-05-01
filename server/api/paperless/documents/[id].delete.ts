import { z } from 'zod'

/**
 * DELETE /api/paperless/documents/:id
 *
 * Deletes a document by ID.
 */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.coerce.number().int().positive()
  }).parse)

  const client = usePaperlessClient(event)

  try {
    await client(`/documents/${id}/`, { method: 'DELETE' })
    return { success: true }
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to delete document from Paperless'
    })
  }
})
