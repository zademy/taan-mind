import type { PaperlessTask } from '~~/shared/types/paperless'

/**
 * GET /api/paperless/tasks
 *
 * Lists background tasks from Paperless-ngx (e.g., document consumption,
 * OCR processing). Supports optional pagination and ordering.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessTask[]>('/tasks/', {
      query: buildPaperlessQuery({
        page: query.page as string | undefined,
        page_size: query.page_size as string | undefined,
        ordering: query.ordering as string | undefined
      })
    })
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to fetch tasks', 500)
  }
})
