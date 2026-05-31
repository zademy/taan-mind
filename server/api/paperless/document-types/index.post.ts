import type { PaperlessDocumentType } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  /** Document type name (required, minimum 1 character). */
  name: z.string().min(1)
})

/**
 * POST /api/paperless/document-types
 *
 * Creates a new document type in Paperless-ngx.
 *
 * @module server/api/paperless
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
    handlePaperlessError(error, 'Failed to create document type in Paperless')
  }
})
