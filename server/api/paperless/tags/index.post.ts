/**
 * Paperless Tags — POST /api/paperless/tags
 *
 * Creates a new tag in Paperless-ngx.
 *
 * @module server/api/paperless
 */

import type { PaperlessTag } from '~~/shared/types/paperless'
import { z } from 'zod'

const bodySchema = z.object({
  /** Tag name (required, minimum 1 character). */
  name: z.string().min(1),
  /** Hex color code for the tag (e.g., `'#ff0000'`). */
  color: z.string().optional(),
  /** Whether this tag should be used as an inbox tag. */
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
    handlePaperlessError(error, 'Failed to create tag in Paperless')
  }
})
