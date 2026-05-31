/**
 * Paperless Correspondents — GET /api/paperless/correspondents
 *
 * Lists all correspondents from Paperless-ngx with pagination and ordering.
 *
 * @module server/api/paperless
 */

import type { PaperlessCorrespondent, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
import { z } from 'zod'

const querySchema = z.object({
  /** Page number for pagination (1-based). */
  page: z.coerce.number().optional(),
  /** Number of items per page. */
  page_size: z.coerce.number().optional(),
  /** Field to order results by (e.g., `'name'`, `'-name'`). */
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
      handlePaperlessError(error, 'Failed to fetch correspondents from Paperless')
    }
  }
)
