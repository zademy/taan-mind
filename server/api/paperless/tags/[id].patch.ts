import type { PaperlessTag } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  is_inbox_tag: z.boolean().optional()
})

/**
 * PATCH /api/paperless/tags/:id
 *
 * Updates an existing tag in Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<PaperlessTag> => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessTag>(`/tags/${id}/`, {
      method: 'PATCH',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to update tag ${id} in Paperless`
    })
  }
})
