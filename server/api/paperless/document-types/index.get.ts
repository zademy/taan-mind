import type { PaperlessDocumentType, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
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
      const err = error as { statusCode?: number; statusMessage?: string }
      throw createError({
        statusCode: err?.statusCode || 502,
        statusMessage: err?.statusMessage || 'Failed to fetch document types from Paperless'
      })
    }
  }
)
