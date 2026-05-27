/**
 * @file Client-side authentication route guard.
 *
 * Global middleware that redirects unauthenticated users to /login
 * and authenticated users away from /login. Supports a redirect
 * query parameter to send users back to their original destination
 * after login.
 */
import { authClient } from '~/utils/auth-client'

/** Route prefixes accessible without authentication. */
const PUBLIC_ROUTE_PREFIXES = ['/login', '/share']

/** Checks whether a route path is publicly accessible. */
function isPublicRoute(path: string) {
  return PUBLIC_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

/**
 * Sanitizes a redirect path to prevent open-redirect vulnerabilities.
 *
 * Only allows relative paths that start with `/` and are not
 * protocol-relative (`//`). Public routes are also rejected as
 * redirect targets to avoid loops.
 *
 * @param value - The raw redirect value from the query string.
 * @returns A safe redirect path (defaults to `/`).
 */
function getSafeRedirectPath(value: unknown) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  if (isPublicRoute(value)) return '/'
  return value
}

export default defineNuxtRouteMiddleware(async to => {
  const { data: session } = await authClient.useSession(useFetch)

  // Authenticated user visiting /login → redirect away
  if (isPublicRoute(to.path)) {
    if (to.path === '/login' && session.value?.user) {
      return navigateTo(getSafeRedirectPath(to.query.redirect))
    }

    return
  }

  // Unauthenticated user visiting a protected route → redirect to /login
  if (!session.value?.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
