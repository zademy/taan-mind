import { z } from 'zod'

/**
 * DELETE /api/paperless/correspondents/:id
 *
 * Deletes a correspondent from Paperless-ngx.
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
    await client(`/correspondents/${id}/`, { method: 'DELETE' })
  } catch (error: unknown) {
    handlePaperlessError(error, `Failed to delete correspondent ${id} from Paperless`)
  }
})
