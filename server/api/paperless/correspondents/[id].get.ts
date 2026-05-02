import type { PaperlessCorrespondent } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * GET /api/paperless/correspondents/:id
 *
 * Returns a single correspondent by ID.
 */
export default defineEventHandler(async (event): Promise<PaperlessCorrespondent> => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessCorrespondent>(`/correspondents/${id}/`)
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to fetch correspondent ${id} from Paperless`
    })
  }
})
