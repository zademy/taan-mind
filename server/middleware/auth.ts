/**
 * @file Server-side authentication middleware.
 *
 * Intercepts every API request and enforces a valid Better Auth session
 * unless the route is public (auth, health, shared-chats, icons) or the
 * request originates from an internal server call.
 *
 * Authenticated sessions are stored in `event.context.authSession` for
 * downstream handlers to reuse without re-fetching.
 */

/** API route prefixes that do not require authentication. */
const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/health',
  '/api/shared-chats',
  /**
   * Nuxt/Icon serves bundled icon collections through this internal API route.
   * It must stay public so unauthenticated pages like /login can render icons.
   */
  '/api/_nuxt_icon'
]

/** Checks whether a request path matches any public API prefix. */
function isPublicApiPath(path: string) {
  return PUBLIC_API_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

export default defineEventHandler(async event => {
  const path = getRequestURL(event).pathname

  // Skip auth for public routes and internal server-to-server calls
  if (!path.startsWith('/api/') || isPublicApiPath(path) || isInternalApiRequest(event)) {
    return
  }

  // Attach the resolved session to event context so handlers can read it
  // without another round-trip to Better Auth
  event.context.authSession = await requireAuthSession(event)
})
