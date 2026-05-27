/**
 * @file Internal API authentication for server-to-server requests.
 *
 * Provides a shared header-based mechanism so that Nitro plugins and
 * internal event handlers can call protected API routes without a
 * user session. The secret value is generated once per process lifetime
 * and never exposed to clients.
 */
import type { H3Event } from 'h3'

/** Header name used to identify internal API requests. */
export const INTERNAL_API_AUTH_HEADER = 'x-taan-internal-request'

/** Random secret generated once per server process. */
const INTERNAL_API_AUTH_VALUE = crypto.randomUUID()

/**
 * Returns the headers required to authenticate an internal API request.
 * Used by server-side $fetch calls that need to bypass user-session auth.
 */
export function getInternalApiAuthHeaders() {
  return {
    [INTERNAL_API_AUTH_HEADER]: INTERNAL_API_AUTH_VALUE
  }
}

/**
 * Checks whether the incoming request originates from an internal server call.
 *
 * @param event - The H3 event to inspect.
 * @returns True if the request carries the correct internal auth header.
 */
export function isInternalApiRequest(event: H3Event) {
  return getHeader(event, INTERNAL_API_AUTH_HEADER) === INTERNAL_API_AUTH_VALUE
}
