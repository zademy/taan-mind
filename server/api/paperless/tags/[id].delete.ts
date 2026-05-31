import { z } from 'zod'

/**
 * DELETE /api/paperless/tags/:id
 *
 * Deletes a tag from Paperless-ngx.
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
    await client(`/tags/${id}/`, { method: 'DELETE' })
  } catch (error: unknown) {
    handlePaperlessError(error, `Failed to delete tag ${id} from Paperless`)
  }
})
