/**
 * Paperless Tags — GET /api/paperless/tags
 *
 * Lists all tags from Paperless-ngx with optional pagination and ordering.
 *
 * @module server/api/paperless
 */

import type { PaperlessTag, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
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
 * GET /api/paperless/tags
 *
 * Lists all tags from Paperless-ngx.
 */
export default defineEventHandler(
  async (event): Promise<PaperlessPaginatedResponse<PaperlessTag>> => {
    const query = await getValidatedQuery(event, querySchema.parse)
    const client = usePaperlessClient(event)

    try {
      return await client<PaperlessPaginatedResponse<PaperlessTag>>('/tags/', {
        query: buildPaperlessQuery(query)
      })
    } catch (error: unknown) {
      handlePaperlessError(error, 'Failed to fetch tags from Paperless')
    }
  }
)
