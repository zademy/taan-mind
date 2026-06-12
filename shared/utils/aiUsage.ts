import type { ModelProvider } from './models'

const AI_USAGE_PROVIDERS = new Set<ModelProvider>([
  'minimax',
  'glm',
  'anthropic',
  'openai',
  'nova',
  'ollama',
  'openrouter'
])

/** Supported dashboard ranges. */
export const AI_USAGE_RANGES = ['7d', '30d', '90d'] as const

/** Supported dashboard authorization scopes. */
export const AI_USAGE_SCOPES = ['mine', 'global'] as const

/** Stable AI operation identifier. */
export type AIUsageOperation =
  | 'chat'
  | 'chat-title'
  | 'inline-assistant'
  | 'document-format'
  | 'document-metadata'
  | 'ocr'
/** Dashboard time range. */
export type AIUsageRange = (typeof AI_USAGE_RANGES)[number]
/** Dashboard authorization scope. */
export type AIUsageScope = (typeof AI_USAGE_SCOPES)[number]

/** Provider-reported token metrics normalized across AI SDK and native APIs. */
export interface AIUsageMetrics {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  inputTokenDetails: {
    noCacheTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
  }
  outputTokenDetails: {
    textTokens: number | null
    reasoningTokens: number | null
  }
}

/** A model that has recorded usage in the selected scope and range. */
export interface AIUsageModelOption {
  model: string
  provider: ModelProvider
  label: string
}

/** Aggregated summary for the selected dashboard filters. */
export interface AIUsageSummary {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  generations: number
  reportedGenerations: number
  activeDays: number
  coveragePercent: number
}

/** One UTC day of token usage. */
export interface AIUsageDailyPoint {
  date: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  generations: number
  reportedGenerations: number
}

/** Aggregated usage for one model. */
export interface AIUsageModelBreakdown {
  model: string
  provider: ModelProvider
  label: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  generations: number
  reportedGenerations: number
  coveragePercent: number
}

/** Aggregated usage for one application operation. */
export interface AIUsageOperationBreakdown {
  operation: AIUsageOperation
  label: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  generations: number
  reportedGenerations: number
  coveragePercent: number
}

/** Response returned by the token usage dashboard endpoint. */
export interface AIUsageDashboardResponse {
  filters: {
    scope: AIUsageScope
    range: AIUsageRange
    model: string
    from: string
    to: string
    timezone: 'UTC'
  }
  permissions: {
    canViewGlobal: boolean
  }
  summary: AIUsageSummary
  daily: AIUsageDailyPoint[]
  models: AIUsageModelOption[]
  modelBreakdown: AIUsageModelBreakdown[]
  operationBreakdown: AIUsageOperationBreakdown[]
  generatedAt: string
}

/** Human-readable application operation labels. */
export const AI_USAGE_OPERATION_LABELS: Record<AIUsageOperation, string> = {
  chat: 'Chat responses',
  'chat-title': 'Chat titles',
  'inline-assistant': 'Inline assistant',
  'document-format': 'Document formatting',
  'document-metadata': 'Document metadata',
  ocr: 'Ollama OCR'
}

/** Number of days represented by each dashboard range. */
export const AI_USAGE_RANGE_DAYS: Record<AIUsageRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90
}

/**
 * Extracts a supported provider from a full `provider/modelId` identifier.
 *
 * Historical dynamic model IDs may no longer exist in the active model list,
 * so this validates only the stable provider prefix.
 */
export function getAIUsageModelProvider(model: string): ModelProvider {
  const provider = model.split('/', 1)[0]

  if (AI_USAGE_PROVIDERS.has(provider as ModelProvider)) {
    return provider as ModelProvider
  }

  throw new Error(`Unsupported AI usage model provider: ${provider || 'missing'}`)
}

/** Returns a stable fallback label for historical or runtime-discovered models. */
export function getAIUsageModelLabel(model: string): string {
  const separatorIndex = model.indexOf('/')
  return separatorIndex >= 0 ? model.slice(separatorIndex + 1) : model
}
