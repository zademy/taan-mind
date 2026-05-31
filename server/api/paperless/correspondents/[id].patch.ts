import type { PaperlessCorrespondent } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).optional()
})

/**
 * PATCH /api/paperless/correspondents/:id
 *
 * Updates an existing correspondent in Paperless-ngx.
 * Only the `name` field can be modified via this endpoint.
 *
 * @module server/api/paperless
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
    handlePaperlessError(error, `Failed to update correspondent ${id} in Paperless`)
  }
})
