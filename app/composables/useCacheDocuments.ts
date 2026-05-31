/**
 * Document Cache Composable
 *
 * Fetches cached Paperless document metadata from the local SQLite database
 * via `/api/cache/documents`. Supports pagination, filtering by processing
 * status, configurable ordering, and free-text search on title/filename.
 *
 * Reactive parameters (refs or plain values) are accepted via `toValue`.
 * The composable uses `useFetch` with `watch` so results update automatically
 * when any parameter changes.
 *
 * @module app/composables
 */
import type { MaybeRef } from 'vue'
import type { ModelId } from '#shared/utils/models'
import type { ProcessingStatus } from '#shared/utils/processingStatus'

interface CacheDocumentListOptions {
  /** Page number (1-based). */
  page?: MaybeRef<number>
  /** Number of items per page. */
  pageSize?: MaybeRef<number>
  /** Filter by cached document processing status. */
  processed?: MaybeRef<ProcessingStatus | undefined>
  /** Field to order results by (e.g. `'-updated_at'`, `'title'`). */
  ordering?: MaybeRef<string>
  /** Global search string for title/originalFileName. */
  search?: MaybeRef<string | undefined>
  /** Filter by MIME type (e.g. 'application/pdf'). */
  mimeType?: MaybeRef<string | undefined>
}

/** Represents a cached Paperless document record from the local SQLite database. */
export interface CacheDocument {
  /** Paperless-ngx document ID (primary key). */
  id: number
  /** Document title. */
  title: string
  /** Correspondent ID, or `null` if unassigned. */
  correspondent: number | null
  /** Document type ID, or `null` if unassigned. */
  documentType: number | null
  /** Storage path ID, or `null` if unassigned. */
  storagePath: number | null
  /** Original uploaded filename. */
  originalFileName: string | null
  /** MIME type of the document file (e.g., `'application/pdf'`). */
  mimeType: string | null
  /** Number of pages in the document, or `null` if unknown. */
  pageCount: number | null
  /** Cached document processing status. */
  processed: ProcessingStatus
  /** Model used for post-OCR enrichment, or `null` until processing completes. */
  processingModel: ModelId | null
  /** When the document was created in Paperless-ngx. */
  paperlessCreated: string | null
  /** When the document was last modified in Paperless-ngx. */
  paperlessModified: string | null
  /** When AI processing started for this document. */
  processingStartedAt: string | null
  /** When AI processing completed for this document. */
  processingCompletedAt: string | null
  /** When this cache record was created locally. */
  createdAt: string
  /** When this cache record was last updated locally. */
  updatedAt: string
}

/** Paginated response returned by the cached documents list endpoint. */
export interface CacheDocumentsResponse {
  /** Total number of matching documents across all pages. */
  count: number
  /** Current page number (1-based). */
  page: number
  /** Number of items per page. */
  pageSize: number
  /** Array of cache document records for the current page. */
  results: CacheDocument[]
}

/**
 * Fetches cached Paperless documents from the local SQLite database.
 *
 * Supports pagination, ordering, and filtering by processed status.
 * Reactive parameters are unwrapped with `toValue` so both static
 * and ref values are accepted.
 *
 * @param options - Pagination, ordering, and filtering options.
 * @returns A `useFetch` result with the paginated cache document list.
 */
export function useCacheDocuments(options: CacheDocumentListOptions = {}) {
  const { page = 1, pageSize = 25, processed, ordering = '-updated_at', search, mimeType } = options

  const params = computed(() => {
    const p: Record<string, string | number> = {
      page: toValue(page),
      page_size: toValue(pageSize),
      ordering: toValue(ordering)
    }

    const proc = toValue(processed)
    if (proc !== undefined) p.processed = proc

    const srch = toValue(search)
    if (srch) p.search = srch

    const mime = toValue(mimeType)
    if (mime) p.mime_type = mime

    return p
  })

  return useFetch<CacheDocumentsResponse>('/api/cache/documents', {
    params,
    watch: [params]
  })
}
