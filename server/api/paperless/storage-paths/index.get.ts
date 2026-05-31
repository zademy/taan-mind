import type { PaperlessPaginatedResponse, PaperlessStoragePath } from '~~/shared/types/paperless'

/**
 * GET /api/paperless/storage-paths
 *
 * Lists all storage paths from Paperless-ngx with optional
 * pagination and ordering.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessPaginatedResponse<PaperlessStoragePath>>('/storage_paths/', {
      query: buildPaperlessQuery({
        page: query.page as string | undefined,
        page_size: query.page_size as string | undefined,
        ordering: query.ordering as string | undefined
      })
    })
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to fetch storage paths', 500)
  }
})
