import type { PaperlessDocumentType } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1)
})

/**
 * POST /api/paperless/document-types
 *
 * Creates a new document type in Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<PaperlessDocumentType> => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocumentType>('/document_types/', {
      method: 'POST',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to create document type in Paperless'
    })
  }
})
