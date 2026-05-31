/**
 * Paperless Document Types — GET /api/paperless/document-types
 *
 * Lists all document types from Paperless-ngx with pagination and ordering.
 *
 * @module server/api/paperless
 */

import type { PaperlessDocumentType, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
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
 * GET /api/paperless/document-types
 *
 * Lists all document types from Paperless-ngx.
 * Local route uses kebab-case; Paperless API uses snake_case (document_types).
 */
export default defineEventHandler(
  async (event): Promise<PaperlessPaginatedResponse<PaperlessDocumentType>> => {
    const query = await getValidatedQuery(event, querySchema.parse)
    const client = usePaperlessClient(event)

    try {
      return await client<PaperlessPaginatedResponse<PaperlessDocumentType>>('/document_types/', {
        query: buildPaperlessQuery(query)
      })
    } catch (error: unknown) {
      handlePaperlessError(error, 'Failed to fetch document types from Paperless')
    }
  }
)
