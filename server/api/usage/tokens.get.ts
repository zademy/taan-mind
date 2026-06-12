import { and, count, eq, gte, lte, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import {
  AI_USAGE_OPERATION_LABELS,
  AI_USAGE_RANGE_DAYS,
  getAIUsageModelLabel,
  type AIUsageDashboardResponse,
  type AIUsageOperation,
  type AIUsageRange,
  type AIUsageScope
} from '#shared/utils/aiUsage'

const tokenUsageQuerySchema = z.object({
  scope: z.enum(['mine', 'global']).default('mine'),
  range: z.enum(['7d', '30d', '90d']).default('30d'),
  model: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine(value => value === 'all' || value.includes('/'), 'Invalid model filter')
    .default('all')
})

/** Converts SQLite aggregate values into finite numbers. */
function aggregateNumber(value: unknown): number {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

/** Calculates a bounded one-decimal usage coverage percentage. */
function coveragePercent(reported: number, total: number): number {
  if (total <= 0) return 0
  return Math.round(Math.min(100, Math.max(0, (reported / total) * 100)) * 10) / 10
}

/** Returns the UTC midnight that starts the requested inclusive day range. */
function getRangeStart(now: Date, range: AIUsageRange): Date {
  const days = AI_USAGE_RANGE_DAYS[range]
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1))
}

/** Returns a dense UTC daily series, including days with no events. */
function fillDailySeries(
  from: Date,
  range: AIUsageRange,
  rows: Array<{
    date: string
    inputTokens: unknown
    outputTokens: unknown
    totalTokens: unknown
    generations: unknown
    reportedGenerations: unknown
  }>
) {
  const rowsByDate = new Map(rows.map(row => [row.date, row]))

  return Array.from({ length: AI_USAGE_RANGE_DAYS[range] }, (_, index) => {
    const date = new Date(from)
    date.setUTCDate(from.getUTCDate() + index)
    const dateKey = date.toISOString().slice(0, 10)
    const row = rowsByDate.get(dateKey)

    return {
      date: dateKey,
      inputTokens: aggregateNumber(row?.inputTokens),
      outputTokens: aggregateNumber(row?.outputTokens),
      totalTokens: aggregateNumber(row?.totalTokens),
      generations: aggregateNumber(row?.generations),
      reportedGenerations: aggregateNumber(row?.reportedGenerations)
    }
  })
}

/**
 * GET /api/usage/tokens
 *
 * Returns bounded provider-reported token analytics for the current user or,
 * for administrators, the complete application.
 */
export default defineEventHandler(async event => {
  const session = await requireAuthSession(event)
  const userId = session.user.id
  const canViewGlobal = (session.user as { role?: string }).role === 'admin'
  const query = await getValidatedQuery(event, tokenUsageQuerySchema.parse)
  const scope = query.scope as AIUsageScope
  const range = query.range as AIUsageRange

  if (scope === 'global' && !canViewGlobal) {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required' })
  }

  const now = new Date()
  const from = getRangeStart(now, range)
  const scopeConditions: SQL[] = [
    gte(schema.aiUsageEvents.createdAt, from),
    lte(schema.aiUsageEvents.createdAt, now)
  ]

  if (scope === 'mine') {
    scopeConditions.push(eq(schema.aiUsageEvents.userId, userId))
  }

  const selectedConditions = [...scopeConditions]
  if (query.model !== 'all') {
    selectedConditions.push(eq(schema.aiUsageEvents.model, query.model))
  }

  const scopeWhere = and(...scopeConditions)
  const selectedWhere = and(...selectedConditions)
  const dateBucket = sql<string>`strftime('%Y-%m-%d', ${schema.aiUsageEvents.createdAt}, 'unixepoch')`
  const sumInputTokens = sql<number>`coalesce(sum(${schema.aiUsageEvents.inputTokens}), 0)`
  const sumOutputTokens = sql<number>`coalesce(sum(${schema.aiUsageEvents.outputTokens}), 0)`
  const sumTotalTokens = sql<number>`coalesce(sum(${schema.aiUsageEvents.totalTokens}), 0)`
  const reportedGenerations = sql<number>`coalesce(sum(case when ${schema.aiUsageEvents.usageAvailable} = 1 then 1 else 0 end), 0)`

  const [summaryRows, dailyRows, modelRows, operationRows, availableModelRows] = await Promise.all([
    db
      .select({
        inputTokens: sumInputTokens,
        outputTokens: sumOutputTokens,
        totalTokens: sumTotalTokens,
        generations: count(),
        reportedGenerations
      })
      .from(schema.aiUsageEvents)
      .where(selectedWhere),
    db
      .select({
        date: dateBucket,
        inputTokens: sumInputTokens,
        outputTokens: sumOutputTokens,
        totalTokens: sumTotalTokens,
        generations: count(),
        reportedGenerations
      })
      .from(schema.aiUsageEvents)
      .where(selectedWhere)
      .groupBy(dateBucket)
      .orderBy(dateBucket),
    db
      .select({
        model: schema.aiUsageEvents.model,
        provider: schema.aiUsageEvents.provider,
        inputTokens: sumInputTokens,
        outputTokens: sumOutputTokens,
        totalTokens: sumTotalTokens,
        generations: count(),
        reportedGenerations
      })
      .from(schema.aiUsageEvents)
      .where(selectedWhere)
      .groupBy(schema.aiUsageEvents.model, schema.aiUsageEvents.provider)
      .orderBy(sql`sum(${schema.aiUsageEvents.totalTokens}) desc`),
    db
      .select({
        operation: schema.aiUsageEvents.operation,
        inputTokens: sumInputTokens,
        outputTokens: sumOutputTokens,
        totalTokens: sumTotalTokens,
        generations: count(),
        reportedGenerations
      })
      .from(schema.aiUsageEvents)
      .where(selectedWhere)
      .groupBy(schema.aiUsageEvents.operation)
      .orderBy(sql`sum(${schema.aiUsageEvents.totalTokens}) desc`),
    db
      .select({
        model: schema.aiUsageEvents.model,
        provider: schema.aiUsageEvents.provider
      })
      .from(schema.aiUsageEvents)
      .where(scopeWhere)
      .groupBy(schema.aiUsageEvents.model, schema.aiUsageEvents.provider)
      .orderBy(schema.aiUsageEvents.provider, schema.aiUsageEvents.model)
  ])

  const daily = fillDailySeries(from, range, dailyRows)
  const summaryRow = summaryRows[0]
  const generations = aggregateNumber(summaryRow?.generations)
  const reported = aggregateNumber(summaryRow?.reportedGenerations)

  const response: AIUsageDashboardResponse = {
    filters: {
      scope,
      range,
      model: query.model,
      from: from.toISOString(),
      to: now.toISOString(),
      timezone: 'UTC'
    },
    permissions: {
      canViewGlobal
    },
    summary: {
      inputTokens: aggregateNumber(summaryRow?.inputTokens),
      outputTokens: aggregateNumber(summaryRow?.outputTokens),
      totalTokens: aggregateNumber(summaryRow?.totalTokens),
      generations,
      reportedGenerations: reported,
      activeDays: daily.filter(point => point.generations > 0).length,
      coveragePercent: coveragePercent(reported, generations)
    },
    daily,
    models: availableModelRows.map(row => ({
      model: row.model,
      provider: row.provider,
      label: getAIUsageModelLabel(row.model)
    })),
    modelBreakdown: modelRows.map(row => {
      const modelGenerations = aggregateNumber(row.generations)
      const modelReported = aggregateNumber(row.reportedGenerations)

      return {
        model: row.model,
        provider: row.provider,
        label: getAIUsageModelLabel(row.model),
        inputTokens: aggregateNumber(row.inputTokens),
        outputTokens: aggregateNumber(row.outputTokens),
        totalTokens: aggregateNumber(row.totalTokens),
        generations: modelGenerations,
        reportedGenerations: modelReported,
        coveragePercent: coveragePercent(modelReported, modelGenerations)
      }
    }),
    operationBreakdown: operationRows.map(row => {
      const operation = row.operation as AIUsageOperation
      const operationGenerations = aggregateNumber(row.generations)
      const operationReported = aggregateNumber(row.reportedGenerations)

      return {
        operation,
        label: AI_USAGE_OPERATION_LABELS[operation],
        inputTokens: aggregateNumber(row.inputTokens),
        outputTokens: aggregateNumber(row.outputTokens),
        totalTokens: aggregateNumber(row.totalTokens),
        generations: operationGenerations,
        reportedGenerations: operationReported,
        coveragePercent: coveragePercent(operationReported, operationGenerations)
      }
    }),
    generatedAt: now.toISOString()
  }

  return response
})
