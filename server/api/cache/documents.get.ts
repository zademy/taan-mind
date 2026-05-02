import { db, schema } from 'hub:db'
import { desc, asc, eq, like, or, and, count, isNull } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'

/**
 * GET /api/cache/documents
 *
 * Returns cached Paperless document metadata from SQLite with pagination,
 * optional `processed` filter, and configurable ordering.
 *
 * The list response intentionally excludes heavyweight document content
 * fields (`ocrContent` and `aiContent`). Those fields are only needed for
 * chat/document processing flows and should not be shipped to table views.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.page_size) || 25))
  const processed = query.processed !== undefined ? Number(query.processed) : undefined
  const ordering = (query.ordering as string) || '-updated_at'

  const search = (query.search as string)?.trim()
  const mimeType = query.mime_type as string

  const t = schema.paperlessDocuments

  // Build where clause
  const conditions = [isNull(t.deletedAt)]
  if (processed !== undefined) conditions.push(eq(t.processed, processed))
  if (search) {
    conditions.push(
      or(
        like(t.title, `%${search}%`),
        like(t.originalFileName, `%${search}%`)
      )!
    )
  }
  if (mimeType) conditions.push(eq(t.mimeType, mimeType))
  const where = conditions.length ? and(...conditions) : undefined

  // Build order
  const isDesc = ordering.startsWith('-')
  const orderField = ordering.replace(/^-/, '')
  const columnMap: Record<string, SQLiteColumn> = {
    id: t.id,
    title: t.title,
    updated_at: t.updatedAt,
    created_at: t.createdAt,
    paperless_modified: t.paperlessModified,
    processed: t.processed,
    mime_type: t.mimeType,
    page_count: t.pageCount,
    paperless_created: t.paperlessCreated,
    correspondent: t.correspondent,
    document_type: t.documentType
  }
  const orderColumn = columnMap[orderField] || t.updatedAt
  const orderFn = isDesc ? desc(orderColumn) : asc(orderColumn)

  // Count total
  const [total] = await db.select({ value: count() }).from(t).where(where)

  // Get paginated metadata only. Avoid shipping OCR/AI text content to list UIs.
  const results = await db.select({
    id: t.id,
    title: t.title,
    correspondent: t.correspondent,
    documentType: t.documentType,
    storagePath: t.storagePath,
    originalFileName: t.originalFileName,
    mimeType: t.mimeType,
    pageCount: t.pageCount,
    processed: t.processed,
    processingStartedAt: t.processingStartedAt,
    processingCompletedAt: t.processingCompletedAt,
    paperlessCreated: t.paperlessCreated,
    paperlessModified: t.paperlessModified,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }).from(t)
    .where(where)
    .orderBy(orderFn)
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return {
    count: total?.value || 0,
    page,
    pageSize,
    results
  }
})
