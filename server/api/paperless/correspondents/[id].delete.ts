import { z } from 'zod'

/**
 * DELETE /api/paperless/correspondents/:id
 *
 * Deletes a correspondent from Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<void> => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number().int().positive() }).parse)
  const client = usePaperlessClient(event)

  try {
    await client(`/correspondents/${id}/`, { method: 'DELETE' })
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to delete correspondent ${id} from Paperless`
    })
  }
})
