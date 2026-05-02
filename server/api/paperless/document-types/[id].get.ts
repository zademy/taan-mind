import type { PaperlessDocumentType } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * GET /api/paperless/document-types/:id
 *
 * Returns a single document type by ID.
 */
export default defineEventHandler(async (event): Promise<PaperlessDocumentType> => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocumentType>(`/document_types/${id}/`)
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to fetch document type ${id} from Paperless`
    })
  }
})
