import { db, schema } from 'hub:db'
import { count, sql, desc } from 'drizzle-orm'

/**
 * Maps processing status codes to human-readable labels.
 * - `0` → Pending (not yet processed)
 * - `1` → Processed (successfully completed)
 * - `2` → Processing (currently in progress)
 */
const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Processed',
  2: 'Processing'
}

/**
 * GET /api/kpi/documents
 *
 * Returns aggregated KPI metrics for cached Paperless documents.
 */
export default defineEventHandler(async () => {
  const t = schema.paperlessDocuments

  const [totalRow] = await db.select({ value: count() }).from(t)

  const statusRows = await db
    .select({ status: t.processed, value: count() })
    .from(t)
    .groupBy(t.processed)

  const mimeRows = await db
    .select({ label: t.mimeType, value: count() })
    .from(t)
    .groupBy(t.mimeType)
    .orderBy(desc(count()))
    .limit(8)

  const monthRows = await db
    .select({
      label: sql<string>`strftime('%Y-%m', ${t.paperlessCreated})`,
      value: count()
    })
    .from(t)
    .groupBy(sql`strftime('%Y-%m', ${t.paperlessCreated})`)
    .orderBy(sql`strftime('%Y-%m', ${t.paperlessCreated})`)

  const docTypeRows = await db
    .select({ label: t.documentType, value: count() })
    .from(t)
    .groupBy(t.documentType)
    .orderBy(desc(count()))
    .limit(8)

  return {
    total: totalRow?.value || 0,
    byStatus: statusRows.map(r => ({
      label: STATUS_LABELS[r.status] ?? `Unknown (${r.status})`,
      value: r.value
    })),
    byMimeType: mimeRows.map(r => ({
      label: r.label || 'Unknown',
      value: r.value
    })),
    byMonth: monthRows.map(r => ({
      label: r.label || 'Unknown',
      value: r.value
    })),
    byDocumentType: docTypeRows.map(r => ({
      label: r.label != null ? String(r.label) : 'Unclassified',
      value: r.value
    }))
  }
})
