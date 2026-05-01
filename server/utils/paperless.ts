import type { H3Event } from 'h3'

/**
 * Creates a pre-configured `$fetch` instance for Paperless-ngx API calls.
 *
 * Reads the base URL and API token from runtime config, validates both
 * are present, and returns a scoped `$fetch` instance with authentication
 * headers and the JSON API version preset.
 *
 * This utility is auto-imported in all server routes via Nuxt's
 * `server/utils/` convention.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns A `$fetch` instance scoped to the Paperless API (`/api` path).
 * @throws Throws a 500 error if base URL or API token is not configured.
 */
export function usePaperlessClient(event: H3Event) {
  const config = useRuntimeConfig(event)

  const baseURL = config.paperlessBaseUrl
  const token = config.paperlessApiToken

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_BASE_URL is not configured'
    })
  }

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_API_TOKEN is not configured'
    })
  }

  return $fetch.create({
    baseURL: `${baseURL.replace(/\/+$/, '')}/api`,
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'application/json; version=5'
    }
  })
}

/**
 * Builds a clean query object for Paperless API pagination and filtering.
 *
 * Strips `undefined`, `null`, and empty-string values from the input
 * so the resulting object only contains valid, non-empty parameters.
 *
 * @param params - Raw query parameters with possible empty values.
 * @returns A sanitized `Record<string, string>` suitable for `$fetch` queries.
 */
export function buildPaperlessQuery(params: Record<string, string | number | boolean | undefined | null>): Record<string, string> {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value)
    }
  }
  return query
}
