import type { PaperlessDocument } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * GET /api/paperless/documents/:id
 *
 * Retrieves a single document by ID.
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.coerce.number().int().positive()
    }).parse
  )

  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocument>(`/documents/${id}/`)
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch document from Paperless'
    })
  }
})
