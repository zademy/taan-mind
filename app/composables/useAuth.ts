/**
 * @file Server-side auth composable for Nuxt pages and server routes.
 *
 * Creates a Better Auth client scoped to the current request origin.
 * On the server, forwards the original cookie header so that session
 * resolution works during SSR. Includes the admin plugin for role-based
 * access control.
 */
import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

/**
 * Returns a Better Auth client configured for the current request context.
 *
 * - Client-side: base URL is the current page origin; no extra headers.
 * - Server-side: forwards the request cookie header so Better Auth can
 *   resolve the session from the database during SSR rendering.
 *
 * @returns A scoped Better Auth client instance.
 */
export function useAuth() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return createAuthClient({
    baseURL: url.origin,
    fetchOptions: { headers },
    plugins: [adminClient()]
  })
}
