import type { H3Event } from 'h3'

/** Name of the cookie used to store the anonymous chat session ID. */
const CHAT_SESSION_COOKIE = 'paperless_chat_session'

/**
 * Returns a user ID derived from a session cookie.
 *
 * If the cookie does not exist, a new UUID is generated, stored as an
 * httpOnly cookie (valid for 1 year), and returned. This allows anonymous
 * users to have persistent chat histories without requiring authentication.
 *
 * @param event - The H3 event used to read and set cookies.
 * @returns The session-based user ID.
 */
export function getChatUserId(event: H3Event): string {
  const existing = getCookie(event, CHAT_SESSION_COOKIE)
  if (existing) return existing

  const sessionId = crypto.randomUUID()
  setCookie(event, CHAT_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  })

  return sessionId
}
