import type { PaperlessDocumentType } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).optional()
})

/**
 * PATCH /api/paperless/document-types/:id
 *
 * Updates an existing document type in Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<PaperlessDocumentType> => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number().int().positive() }).parse)
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocumentType>(`/document_types/${id}/`, {
      method: 'PATCH',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to update document type ${id} in Paperless`
    })
  }
})
