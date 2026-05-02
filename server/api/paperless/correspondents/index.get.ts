import type { PaperlessCorrespondent, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  ordering: z.string().optional()
})

/**
 * GET /api/paperless/correspondents
 *
 * Lists all correspondents from Paperless-ngx.
 */
export default defineEventHandler(
  async (event): Promise<PaperlessPaginatedResponse<PaperlessCorrespondent>> => {
    const query = await getValidatedQuery(event, querySchema.parse)
    const client = usePaperlessClient(event)

    try {
      return await client<PaperlessPaginatedResponse<PaperlessCorrespondent>>('/correspondents/', {
        query: buildPaperlessQuery(query)
      })
    } catch (error: unknown) {
      const err = error as { statusCode?: number; statusMessage?: string }
      throw createError({
        statusCode: err?.statusCode || 502,
        statusMessage: err?.statusMessage || 'Failed to fetch correspondents from Paperless'
      })
    }
  }
)
