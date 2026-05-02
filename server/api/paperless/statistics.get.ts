import type { PaperlessStatistics } from '~~/shared/types/paperless'

/**
 * GET /api/paperless/statistics
 *
 * Retrieves global statistics from Paperless-ngx,
 * including total documents, inbox count, file type distribution,
 * and character count for OCR content.
 */
export default defineEventHandler(async event => {
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessStatistics>('/statistics/')
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to fetch statistics'
    })
  }
})
