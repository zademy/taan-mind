/**
 * Cache Documents List — GET /api/cache/documents
 *
 * Returns cached Paperless document metadata from SQLite with pagination,
 * optional `processed` filter, and configurable ordering.
 *
 * The list response intentionally excludes heavyweight document content
 * fields (`ocrContent` and `aiContent`). Those fields are only needed for
 * chat/document processing flows and should not be shipped to table views.
 *
 * @module server/api/cache
 */
/**
 * Cache Documents List — GET /api/cache/documents
 *
 * Returns cached Paperless document metadata from SQLite with pagination,
 * optional `processed` filter, and configurable ordering.
 *
 * The list response intentionally excludes heavyweight document content
 * fields (`ocrContent` and `aiContent`). Those fields are only needed for
 * chat/document processing flows and should not be shipped to table views.
 *
 * @module server/api/cache
 */
import { db, schema } from 'hub:db'
import { desc, asc, eq, like, or, and, count, isNull } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { ProcessingStatus } from '#shared/utils/processingStatus'

const processingStatuses = [
  ProcessingStatus.Pending,
  ProcessingStatus.Processed,
  ProcessingStatus.Processing
] as const

const documentOrderingValues = [
  'id',
  '-id',
  'title',
  '-title',
  'updated_at',
  '-updated_at',
  'created_at',
  '-created_at',
  'paperless_modified',
  '-paperless_modified',
  'processed',
  '-processed',
  'processing_model',
  '-processing_model',
  'mime_type',
  '-mime_type',
  'page_count',
  '-page_count',
  'paperless_created',
  '-paperless_created',
  'correspondent',
  '-correspondent',
  'document_type',
  '-document_type'
] as const

/**
 * Query parameters for the cached documents list.
 *
 * - `page` — 1-based page number (default 1)
 * - `page_size` — items per page, 1–100 (default 25)
 * - `processed` — optional ProcessingStatus filter
 * - `ordering` — sort field with optional `-` prefix for descending (default `-updated_at`)
 * - `search` — title/originalFileName free-text filter
 * - `mime_type` — exact MIME type match
 */
/** Query parameters for the cached documents list. */
const cacheDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  processed: z.coerce
    .number()
    .int()
    .refine(value => processingStatuses.includes(value as ProcessingStatus), {
      message: 'Invalid processing status'
    })
    .optional(),
  ordering: z.enum(documentOrderingValues).default('-updated_at'),
  search: z
    .string()
    .trim()
    .optional()
    .transform(value => value || undefined),
  mime_type: z
    .string()
    .trim()
    .optional()
    .transform(value => value || undefined)
})

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
export default defineEventHandler(async event => {
  const query = await getValidatedQuery(event, cacheDocumentsQuerySchema.parse)
  const { page, processed, ordering, search } = query
  const pageSize = query.page_size
  const mimeType = query.mime_type

  const t = schema.paperlessDocuments

  // Build where clause
  const conditions = [isNull(t.deletedAt)]
  if (processed !== undefined) conditions.push(eq(t.processed, processed))
  if (search) {
    conditions.push(or(like(t.title, `%${search}%`), like(t.originalFileName, `%${search}%`))!)
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
    processing_model: t.processingModel,
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
  const results = await db
    .select({
      id: t.id,
      title: t.title,
      correspondent: t.correspondent,
      documentType: t.documentType,
      storagePath: t.storagePath,
      originalFileName: t.originalFileName,
      mimeType: t.mimeType,
      pageCount: t.pageCount,
      processed: t.processed,
      processingModel: t.processingModel,
      processingStartedAt: t.processingStartedAt,
      processingCompletedAt: t.processingCompletedAt,
      paperlessCreated: t.paperlessCreated,
      paperlessModified: t.paperlessModified,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    })
    .from(t)
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
