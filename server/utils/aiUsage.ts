import type { LanguageModelUsage } from 'ai'
import { consola } from 'consola'
import { db, schema } from 'hub:db'
import type { AIUsageMetrics, AIUsageOperation } from '#shared/utils/aiUsage'
import { getAIUsageModelProvider } from '#shared/utils/aiUsage'

/** Input accepted by the centralized token usage recorder. */
interface RecordAIUsageInput {
  userId?: string | null
  chatId?: string | null
  documentId?: number | null
  model: string
  operation: AIUsageOperation
  usage: AIUsageMetrics
  finishReason?: string | null
  providerResponseId?: string | null
}

/** Converts an unknown token counter into a non-negative integer or null. */
function normalizeTokenCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  return Math.trunc(value)
}

/** Normalizes AI SDK usage into the stable application contract. */
export function normalizeLanguageModelUsage(usage?: LanguageModelUsage | null): AIUsageMetrics {
  const inputTokens = normalizeTokenCount(usage?.inputTokens)
  const outputTokens = normalizeTokenCount(usage?.outputTokens)
  const reportedTotalTokens = normalizeTokenCount(usage?.totalTokens)

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      reportedTotalTokens ??
      (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null),
    inputTokenDetails: {
      noCacheTokens: normalizeTokenCount(usage?.inputTokenDetails?.noCacheTokens),
      cacheReadTokens: normalizeTokenCount(usage?.inputTokenDetails?.cacheReadTokens),
      cacheWriteTokens: normalizeTokenCount(usage?.inputTokenDetails?.cacheWriteTokens)
    },
    outputTokenDetails: {
      textTokens: normalizeTokenCount(usage?.outputTokenDetails?.textTokens),
      reasoningTokens: normalizeTokenCount(usage?.outputTokenDetails?.reasoningTokens)
    }
  }
}

/** Normalizes native Ollama `/api/generate` evaluation counters. */
export function normalizeOllamaUsage(input: {
  promptEvalCount?: number
  evalCount?: number
}): AIUsageMetrics {
  const inputTokens = normalizeTokenCount(input.promptEvalCount)
  const outputTokens = normalizeTokenCount(input.evalCount)

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null,
    inputTokenDetails: {
      noCacheTokens: inputTokens,
      cacheReadTokens: null,
      cacheWriteTokens: null
    },
    outputTokenDetails: {
      textTokens: outputTokens,
      reasoningTokens: null
    }
  }
}

/** Returns whether at least one provider-reported token counter is available. */
function hasReportedAIUsage(usage: AIUsageMetrics): boolean {
  return [
    usage.inputTokens,
    usage.outputTokens,
    usage.totalTokens,
    usage.inputTokenDetails.noCacheTokens,
    usage.inputTokenDetails.cacheReadTokens,
    usage.inputTokenDetails.cacheWriteTokens,
    usage.outputTokenDetails.textTokens,
    usage.outputTokenDetails.reasoningTokens
  ].some(value => value != null)
}

/**
 * Persists one append-only usage event.
 *
 * Telemetry is best-effort: database failures are logged and never propagate
 * into a successful model response.
 */
export async function recordAIUsage(input: RecordAIUsageInput): Promise<void> {
  try {
    const provider = getAIUsageModelProvider(input.model)
    const usageAvailable = hasReportedAIUsage(input.usage)

    await db.insert(schema.aiUsageEvents).values({
      userId: input.userId ?? null,
      chatId: input.chatId ?? null,
      documentId: input.documentId ?? null,
      provider,
      model: input.model,
      operation: input.operation,
      usageAvailable,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens,
      noCacheTokens: input.usage.inputTokenDetails.noCacheTokens,
      cacheReadTokens: input.usage.inputTokenDetails.cacheReadTokens,
      cacheWriteTokens: input.usage.inputTokenDetails.cacheWriteTokens,
      textTokens: input.usage.outputTokenDetails.textTokens,
      reasoningTokens: input.usage.outputTokenDetails.reasoningTokens,
      finishReason: input.finishReason ?? null,
      providerResponseId: input.providerResponseId ?? null
    })
  } catch (error) {
    consola.warn('[AI Usage] Failed to persist token usage', {
      model: input.model,
      operation: input.operation,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
