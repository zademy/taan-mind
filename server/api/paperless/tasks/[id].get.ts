import { z } from 'zod'
import type { PaperlessTask } from '~~/shared/types/paperless'

const paramsSchema = z.object({
  id: z.string().uuid()
})

/**
 * GET /api/paperless/tasks/:id
 *
 * Retrieves a specific background task by its UUID.
 * Looks up the task via the `task_id` query parameter on the Paperless API.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessTask[]>('/tasks/', {
      query: buildPaperlessQuery({
        task_id: id
      })
    })
  } catch (error: unknown) {
    handlePaperlessError(error, `Failed to fetch task ${id}`, 500)
  }
})
