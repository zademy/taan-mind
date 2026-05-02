import type { PaperlessStatistics } from '~~/shared/types/paperless'

/**
 * Fetches the global Paperless-ngx statistics.
 *
 * Uses `useLazyFetch` so the request does not block navigation.
 *
 * @returns A `useLazyFetch` result with the statistics data.
 */
export function usePaperlessStatistics() {
  return useLazyFetch<PaperlessStatistics>('/api/paperless/statistics')
}
