import type { PaperlessStatistics } from '~~/shared/types/paperless'

/**
 * GET /api/paperless/statistics
 *
 * Retrieves global statistics from Paperless-ngx,
 * including total documents, inbox count, file type distribution,
 * and character count for OCR content.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessStatistics>('/statistics/')
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to fetch statistics', 500)
  }
})
