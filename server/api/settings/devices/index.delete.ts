import { db, schema } from 'hub:db'
import { and, eq, ne } from 'drizzle-orm'
import type { DeleteDeviceSessionsResult } from '#shared/utils/deviceSessions'

/**
 * DELETE /api/settings/devices
 *
 * Revokes every active Better Auth session owned by the current user
 * **except** the session making this request.
 *
 * @remarks
 * Intentionally preserves the current session so users are not accidentally
 * signed out when revoking all other devices from the settings modal.
 *
 * @returns DeleteDeviceSessionsResult — `{ ok: true, deletedCount }`
 *
 * @module server/api/settings
 */
export default defineEventHandler(async (event): Promise<DeleteDeviceSessionsResult> => {
  const authSession = await requireAuthSession(event)

  const deletedSessions = await db
    .delete(schema.session)
    .where(
      and(
        eq(schema.session.userId, authSession.user.id),
        ne(schema.session.id, authSession.session.id)
      )
    )
    .returning({ id: schema.session.id })

  return {
    ok: true,
    deletedCount: deletedSessions.length
  }
})
