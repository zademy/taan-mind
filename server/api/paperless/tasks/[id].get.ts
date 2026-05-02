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
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || `Failed to fetch task ${id}`
    })
  }
})
