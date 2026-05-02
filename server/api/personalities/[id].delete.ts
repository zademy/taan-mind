import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * DELETE /api/personalities/:id
 *
 * Deletes a custom personality owned by the current anonymous user.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1)
    }).parse
  )

  const [personality] = await db
    .delete(schema.customPersonalities)
    .where(
      and(eq(schema.customPersonalities.id, id), eq(schema.customPersonalities.userId, userId))
    )
    .returning({ id: schema.customPersonalities.id })

  if (!personality) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Custom personality not found'
    })
  }

  return { ok: true }
})
