import type { PaperlessTag } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * GET /api/paperless/tags/:id
 *
 * Returns a single tag by ID.
 */
export default defineEventHandler(async (event): Promise<PaperlessTag> => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number().int().positive() }).parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessTag>(`/tags/${id}/`)
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to fetch tag ${id} from Paperless`
    })
  }
})
