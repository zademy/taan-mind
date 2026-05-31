/**
 * Device Sessions — GET /api/settings/devices
 *
 * Returns active Better Auth sessions for the current user.
 * Only sessions with a future `expiresAt` are returned.
 * The current session is marked with `isCurrent: true`.
 *
 * @uses createDeviceSession — enriches raw rows with browser/OS metadata.
 * @module server/api/settings
 */

import { db, schema } from 'hub:db'
import { and, desc, eq, gt } from 'drizzle-orm'
import type { DeviceSession } from '#shared/utils/deviceSessions'
import { createDeviceSession } from '#shared/utils/deviceSessions'

/**
 * GET /api/settings/devices
 *
 * Returns active Better Auth sessions for the current authenticated user.
 *
 * @remarks
 * `updatedAt` is used as the "last active" timestamp because Better Auth
 * refreshes sessions on a schedule rather than on every request, so it is
 * a more reliable indicator of recency than `createdAt`.
 *
 * Only sessions with a future `expiresAt` are returned. The current request
 * session is marked with `isCurrent: true` in the response so the UI can
 * apply visual protection (no delete button, "Current" badge).
 *
 * @returns DeviceSession[] sorted by last activity (most recent first).
 *
 * @uses createDeviceSession — enriches raw session rows with parsed browser/OS
 *   metadata and human-readable labels.
 */
export default defineEventHandler(async (event): Promise<DeviceSession[]> => {
  const authSession = await requireAuthSession(event)
  const currentSessionId = authSession.session.id
  const userId = authSession.user.id

  const sessions = await db
    .select({
      id: schema.session.id,
      createdAt: schema.session.createdAt,
      updatedAt: schema.session.updatedAt,
      expiresAt: schema.session.expiresAt,
      ipAddress: schema.session.ipAddress,
      userAgent: schema.session.userAgent,
      userName: schema.user.name,
      userEmail: schema.user.email
    })
    .from(schema.session)
    .innerJoin(schema.user, eq(schema.user.id, schema.session.userId))
    .where(and(eq(schema.session.userId, userId), gt(schema.session.expiresAt, new Date())))
    .orderBy(desc(schema.session.updatedAt))

  return sessions.map(session =>
    createDeviceSession({
      ...session,
      isCurrent: session.id === currentSessionId
    })
  )
})
