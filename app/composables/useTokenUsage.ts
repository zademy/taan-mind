import type { ComputedRef } from 'vue'
import type { AIUsageDashboardResponse, AIUsageRange, AIUsageScope } from '#shared/utils/aiUsage'

/** Reactive query accepted by the token usage dashboard endpoint. */
interface TokenUsageQuery {
  scope: AIUsageScope
  range: AIUsageRange
  model: string
}

/**
 * Fetches token usage analytics for the active scope, range, and model.
 *
 * The computed query keeps SSR and client-side filter changes on the same
 * Nuxt data lifecycle instead of issuing manual browser-only requests.
 */
export function useTokenUsage(query: ComputedRef<TokenUsageQuery>) {
  return useFetch<AIUsageDashboardResponse>('/api/usage/tokens', {
    key: 'token-usage-dashboard',
    query
  })
}
