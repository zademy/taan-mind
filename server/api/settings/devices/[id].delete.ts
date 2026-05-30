import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * DELETE /api/settings/devices/:id
 *
 * Revokes a single Better Auth session by ID, scoped to the authenticated
 * user. The session being used to make this request cannot be revoked
 * through this endpoint (returns 400).
 *
 * @param id — Better Auth session ID from the session table.
 *
 * @errors
 * - 400 — Attempting to delete the current device session.
 * - 404 — No session found with the given ID belonging to this user.
 */
export default defineEventHandler(async event => {
  const authSession = await requireAuthSession(event)
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1)
    }).parse
  )

  if (id === authSession.session.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot delete the current device session'
    })
  }

  const [deletedSession] = await db
    .delete(schema.session)
    .where(and(eq(schema.session.id, id), eq(schema.session.userId, authSession.user.id)))
    .returning({ id: schema.session.id })

  if (!deletedSession) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Device session not found'
    })
  }

  return { ok: true }
})
