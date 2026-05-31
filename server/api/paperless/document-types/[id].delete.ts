import { z } from 'zod'

/**
 * DELETE /api/paperless/document-types/:id
 *
 * Deletes a document type from Paperless-ngx.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async (event): Promise<void> => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const client = usePaperlessClient(event)

  try {
    await client(`/document_types/${id}/`, { method: 'DELETE' })
  } catch (error: unknown) {
    handlePaperlessError(error, `Failed to delete document type ${id} from Paperless`)
  }
})
