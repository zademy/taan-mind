import type { PaperlessCorrespondent } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  /** Correspondent name (required, minimum 1 character). */
  name: z.string().min(1)
})

/**
 * POST /api/paperless/correspondents
 *
 * Creates a new correspondent in Paperless-ngx.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async (event): Promise<PaperlessCorrespondent> => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessCorrespondent>('/correspondents/', {
      method: 'POST',
      body
    })
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to create correspondent in Paperless')
  }
})
