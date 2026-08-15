/**
 * @file Paperless-ngx API client factory and query builder.
 *
 * Provides a pre-authenticated `$fetch` instance scoped to the Paperless API
 * and a utility to sanitize query parameters before forwarding them upstream.
 */
import type { H3Event } from 'h3'
import { stripTrailingSlash } from './url'

const PAPERLESS_API_ACCEPT_HEADER = 'application/json'

/**
 * Diagnostic message returned by callers when the Paperless runtime config
 * is incomplete (missing base URL or API token).
 */
export const PAPERLESS_CONFIG_MISSING_MESSAGE =
  'NUXT_PAPERLESS_BASE_URL or NUXT_PAPERLESS_API_TOKEN is missing'

/**
 * Resolved Paperless runtime configuration used to build fetch clients.
 *
 * Provides pre-computed header sets so downstream callers never have to
 * rebuild authentication or content-type headers for each request.
 */
export interface PaperlessRuntimeConfig {
  /** Paperless base URL with trailing slash removed. */
  baseUrl: string
  /** Full base URL including the `/api` path used by every endpoint. */
  apiBaseUrl: string
  /** Headers for read-only requests that do not need an Accept version. */
  authHeaders: {
    Authorization: string
  }
  /** Headers for JSON read requests (token authentication + versioned accept). */
  jsonHeaders: {
    Authorization: string
    Accept: string
  }
  /** Headers for JSON write requests (token auth, versioned accept, JSON content type). */
  jsonContentHeaders: {
    Authorization: string
    Accept: string
    'Content-Type': string
  }
}

/**
 * Concrete shape of the `$fetch` instance returned by `createPaperlessClient`.
 */
export type PaperlessFetchClient = ReturnType<typeof createPaperlessClient>

type PaperlessErrorLike = {
  statusCode?: number
  statusMessage?: string
}

function isPaperlessErrorLike(error: unknown): error is PaperlessErrorLike {
  return typeof error === 'object' && error !== null
}

function readPaperlessRuntimeConfig(event?: H3Event) {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()

  return {
    baseUrl: config.paperlessBaseUrl ? stripTrailingSlash(config.paperlessBaseUrl) : '',
    token: config.paperlessApiToken || ''
  }
}

function buildPaperlessRuntimeConfig(baseUrl: string, token: string): PaperlessRuntimeConfig {
  const authHeaders = {
    Authorization: `Token ${token}`
  }

  const jsonHeaders = {
    ...authHeaders,
    Accept: PAPERLESS_API_ACCEPT_HEADER
  }

  return {
    baseUrl,
    apiBaseUrl: `${baseUrl}/api`,
    authHeaders,
    jsonHeaders,
    jsonContentHeaders: {
      ...jsonHeaders,
      'Content-Type': 'application/json'
    }
  }
}

/**
 * Returns the Paperless runtime config or `null` when it cannot be built.
 *
 * Use this variant when the caller can degrade gracefully (for example,
 * feature-gated UI panels) instead of throwing on missing configuration.
 *
 * @param event - Optional H3 event used to resolve the runtime config.
 * @returns A populated config object, or `null` if the base URL or token is missing.
 */
export function getOptionalPaperlessConfig(event?: H3Event): PaperlessRuntimeConfig | null {
  const { baseUrl, token } = readPaperlessRuntimeConfig(event)

  if (!baseUrl || !token) {
    return null
  }

  return buildPaperlessRuntimeConfig(baseUrl, token)
}

/**
 * Returns the Paperless runtime config and throws a 500 if it is incomplete.
 *
 * Prefer this variant inside API route handlers so misconfiguration surfaces
 * as a clear server error instead of silently returning `null`.
 *
 * @param event - Optional H3 event used to resolve the runtime config.
 * @returns A populated config object with all header sets ready to use.
 * @throws Throws a 500 error if the base URL or API token is not configured.
 */
export function getPaperlessConfig(event?: H3Event): PaperlessRuntimeConfig {
  const { baseUrl, token } = readPaperlessRuntimeConfig(event)

  if (!baseUrl) {
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

  return buildPaperlessRuntimeConfig(baseUrl, token)
}

/**
 * Creates a scoped `$fetch` instance pointed at the Paperless `/api` root.
 *
 * The returned client is pre-configured with the JSON version header and
 * token-based authentication so callers only supply the resource path.
 *
 * @param config - The Paperless runtime config providing `apiBaseUrl` and `jsonHeaders`.
 * @returns A `$fetch` instance scoped to the Paperless API.
 */
export function createPaperlessClient({ apiBaseUrl, jsonHeaders }: PaperlessRuntimeConfig) {
  return $fetch.create({
    baseURL: apiBaseUrl,
    headers: jsonHeaders
  })
}

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
  return createPaperlessClient(getPaperlessConfig(event))
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
export function buildPaperlessQuery(
  params: Record<string, string | number | boolean | undefined | null>
): Record<string, string> {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value)
    }
  }
  return query
}

/**
 * Converts upstream Paperless errors into stable H3 errors.
 *
 * Preserves upstream HTTP status details when available and falls back to
 * route-specific messages when the Paperless client throws an untyped error.
 *
 * @param error - Unknown error caught from a Paperless upstream request.
 * @param fallbackStatusMessage - Safe message exposed when upstream omits one.
 * @param fallbackStatusCode - Safe status code exposed when upstream omits one.
 * @throws Always throws a Nuxt/H3 error.
 */
export function handlePaperlessError(
  error: unknown,
  fallbackStatusMessage: string,
  fallbackStatusCode = 502
): never {
  const err = isPaperlessErrorLike(error) ? error : undefined

  throw createError({
    statusCode: err?.statusCode || fallbackStatusCode,
    statusMessage: err?.statusMessage || fallbackStatusMessage
  })
}
