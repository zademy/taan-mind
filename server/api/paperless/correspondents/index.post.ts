import type { PaperlessCorrespondent } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1)
})

/**
 * POST /api/paperless/correspondents
 *
 * Creates a new correspondent in Paperless-ngx.
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
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to create correspondent in Paperless'
    })
  }
})
