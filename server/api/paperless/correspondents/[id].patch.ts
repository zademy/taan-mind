import type { PaperlessCorrespondent } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).optional()
})

/**
 * PATCH /api/paperless/correspondents/:id
 *
 * Updates an existing correspondent in Paperless-ngx.
 */
export default defineEventHandler(async (event): Promise<PaperlessCorrespondent> => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const body = await readValidatedBody(event, bodySchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessCorrespondent>(`/correspondents/${id}/`, {
      method: 'PATCH',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || `Failed to update correspondent ${id} in Paperless`
    })
  }
})
