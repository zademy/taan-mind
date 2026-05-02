import { z } from 'zod'
import type { PaperlessStoragePath } from '~~/shared/types/paperless'

const paramsSchema = z.object({
  id: z.coerce.number().int().positive()
})

/**
 * GET /api/paperless/storage-paths/:id
 *
 * Retrieves a single storage path by its ID.
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessStoragePath>(`/storage_paths/${id}/`)
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || `Failed to fetch storage path ${id}`
    })
  }
})
