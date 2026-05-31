import { z } from 'zod'

/**
 * DELETE /api/paperless/documents/:id
 *
 * Deletes a document by ID.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.coerce.number().int().positive()
    }).parse
  )

  const client = usePaperlessClient(event)

  try {
    await client(`/documents/${id}/`, { method: 'DELETE' })
    return { success: true }
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to delete document from Paperless')
  }
})
