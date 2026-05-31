/**
 * Paperless Tags — PATCH /api/paperless/tags/:id
 *
 * Updates an existing tag in Paperless-ngx.
 * Supports partial updates via optional body fields.
 *
 * @module server/api/paperless
 */

import type { PaperlessTag } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  /** Updated tag name (optional for partial updates). */
  name: z.string().min(1).optional(),
  /** Hex color code for the tag (e.g., `'#ff0000'`). */
  color: z.string().optional(),
  /** Whether this tag should be used as an inbox tag. */
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
    handlePaperlessError(error, `Failed to update tag ${id} in Paperless`)
  }
})
