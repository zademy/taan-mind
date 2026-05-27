/**
 * @file Authenticated session management for chat persistence.
 *
 * Provides Better Auth-backed user identity helpers for server routes.
 */
import type { H3Event } from 'h3'
import { auth } from '~~/server/utils/betterAuth'

type AuthSession = NonNullable<Awaited<ReturnType<typeof getAuthSession>>>

/** Legacy cookie name used by anonymous sessions before Better Auth. */
export const ANONYMOUS_CHAT_SESSION_COOKIE = 'paperless_chat_session'

/**
 * Returns the current Better Auth session, if present.
 *
 * @param event - The H3 event used to read request headers.
 * @returns The authenticated session or null.
 */
export async function getAuthSession(event: H3Event) {
  return await auth.api.getSession({ headers: event.headers })
}

/**
 * Requires an authenticated Better Auth session.
 *
 * @param event - The H3 event used to read request headers.
 * @returns The authenticated session.
 */
export async function requireAuthSession(event: H3Event) {
  const session =
    (event.context.authSession as AuthSession | undefined) || (await getAuthSession(event))

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  event.context.authSession = session

  return session
}

/**
 * Returns the authenticated user ID used by owned chat/project records.
 *
 * @param event - The H3 event used to read request headers.
 * @returns The Better Auth user ID.
 */
export function getChatUserId(event: H3Event): string {
  const session = event.context.authSession as AuthSession | undefined

  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return session.user.id
}
