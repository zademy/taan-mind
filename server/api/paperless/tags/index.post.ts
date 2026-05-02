import type { PaperlessTag } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  is_inbox_tag: z.boolean().optional()
})

/**
 * POST /api/paperless/tags
 *
 * Creates a new tag in Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<PaperlessTag> => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessTag>('/tags/', {
      method: 'POST',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to create tag in Paperless'
    })
  }
})
