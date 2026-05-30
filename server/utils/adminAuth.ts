import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * Requires the current request user to have the Better Auth admin role.
 *
 * Session payloads are not trusted as the source of truth for authorization;
 * the role is read from SQLite on every privileged settings mutation.
 */
export async function requireAdminSession(event: H3Event) {
  const authSession = await requireAuthSession(event)

  const [currentUser] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      role: schema.user.role
    })
    .from(schema.user)
    .where(eq(schema.user.id, authSession.user.id))
    .limit(1)

  if (!currentUser || currentUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  return {
    session: authSession.session,
    user: currentUser
  }
}
