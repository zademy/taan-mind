import type {
  PaperlessPaginatedResponse,
  PaperlessDocument,
  PaperlessSearchResult
} from '~~/shared/types/paperless'

/** Options for the {@link useDocuments} composable. */
interface DocumentListOptions {
  /** Page number (1-based). */
  page?: Ref<number> | number
  /** Number of items per page. */
  pageSize?: Ref<number> | number
  /** Field to order results by (e.g. `'-created'`, `'title'`). */
  ordering?: Ref<string> | string
  /** Full-text search query string. */
  query?: Ref<string> | string
  /** Filter by correspondent ID. */
  correspondentId?: Ref<number | null> | number | null
  /** Filter by document-type ID. */
  documentTypeId?: Ref<number | null> | number | null
  /** Filter by tag IDs (documents must have ALL listed tags). */
  tagsIdIn?: Ref<number[] | null> | number[] | null
  /** When `true`, uses `useLazyFetch` instead of `useFetch` (non-blocking). */
  lazy?: boolean
}

/**
 * Fetches a paginated, filterable list of documents from the Paperless-ngx API.
 *
 * Supports filtering by correspondent, document type, tags, and a full-text
 * search query. Reactive parameters are unwrapped with `toValue` so both
 * static and ref values are accepted.
 *
 * @param options - Pagination, ordering, filtering, and fetch-mode options.
 * @returns A `useFetch` / `useLazyFetch` result with the paginated document list.
 */
export function useDocuments(options: DocumentListOptions = {}) {
  const params = computed(() => {
    const p: Record<string, string | number> = {}

    const page = toValue(options.page)
    if (page) p.page = page

    const pageSize = toValue(options.pageSize)
    if (pageSize) p.page_size = pageSize

    const ordering = toValue(options.ordering)
    if (ordering) p.ordering = ordering

    const query = toValue(options.query)
    if (query) p.query = query

    const correspondent = toValue(options.correspondentId)
    if (correspondent != null) p.correspondent__id = correspondent

    const documentType = toValue(options.documentTypeId)
    if (documentType != null) p.document_type__id = documentType

    const tags = toValue(options.tagsIdIn)
    if (tags?.length) p.tags__id__in = tags.join(',')

    return p
  })

  const fetchFn = options.lazy ? useLazyFetch : useFetch

  return fetchFn<PaperlessPaginatedResponse<PaperlessDocument>>(
    '/api/paperless/documents',
    { params }
  )
}

/**
 * Fetches a single document by its ID.
 *
 * @param id - Reactive or static document ID.
 * @returns A `useFetch` result with the document data.
 */
export function useDocument(id: MaybeRef<number>) {
  const url = computed(() => `/api/paperless/documents/${toValue(id)}`)

  return useFetch<PaperlessDocument>(url)
}

/**
 * Provides mutation helpers for updating, deleting, and uploading documents.
 *
 * All mutations automatically include the CSRF token header required by the API.
 *
 * @returns An object with `update`, `remove`, and `upload` async functions.
 */
export function useDocumentMutations() {
  const { csrf, headerName } = useCsrf()

  /**
   * Partially updates an existing document.
   *
   * @param id - The document ID to update.
   * @param body - The fields to update.
   * @returns The updated document.
   */
  async function update(id: number, body: Partial<PaperlessDocument>) {
    return $fetch<PaperlessDocument>(`/api/paperless/documents/${id}`, {
      method: 'PATCH',
      body,
      headers: { [headerName]: csrf }
    })
  }

  /**
   * Deletes a document by ID.
   *
   * @param id - The document ID to delete.
   */
  async function remove(id: number) {
    return $fetch(`/api/paperless/documents/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
  }

  /**
   * Uploads a new document file, optionally with metadata.
   *
   * @param file - The file to upload.
   * @param metadata - Optional metadata (title, correspondent, document type, tags).
   * @returns The API response for the upload.
   */
  async function upload(
    file: File,
    metadata?: {
      title?: string
      correspondent?: number
      document_type?: number
      tags?: number[]
    }
  ) {
    const formData = new FormData()
    formData.append('document', file)

    if (metadata?.title) formData.append('title', metadata.title)
    if (metadata?.correspondent != null)
      formData.append('correspondent', String(metadata.correspondent))
    if (metadata?.document_type != null)
      formData.append('document_type', String(metadata.document_type))
    if (metadata?.tags?.length)
      metadata.tags.forEach(tag => formData.append('tags', String(tag)))

    return $fetch('/api/paperless/documents/upload', {
      method: 'POST',
      body: formData,
      headers: { [headerName]: csrf }
    })
  }

  /**
   * Triggers OCR processing for a cached document.
   * Downloads the document from Paperless and extracts text via Ollama.
   *
   * @param id - The document ID to process.
   * @returns The OCR result with extracted pages and method used.
   */
  async function ocr(id: number): Promise<OcrDocumentResponse> {
    return $fetch(`/api/paperless/documents/${id}/ocr`, {
      method: 'POST',
      headers: { [headerName]: csrf }
    })
  }

  return { update, remove, upload, ocr }
}

/**
 * Performs a full-text search across documents via the Paperless-ngx search API.
 *
 * Uses `useLazyFetch` so the request does not block navigation.
 * Automatically re-fetches when the search term or limit changes.
 *
 * @param term - Reactive or static search term.
 * @param limit - Maximum number of results to return.
 * @returns A `useLazyFetch` result with the search results.
 */
export function useDocumentSearch(term: MaybeRef<string>, limit?: MaybeRef<number>) {
  const params = computed(() => {
    const t = toValue(term)
    if (!t) return null
    const p: Record<string, string | number> = { term: t }
    const l = toValue(limit)
    if (l) p.limit = l
    return p
  })

  return useLazyFetch<PaperlessPaginatedResponse<PaperlessSearchResult>>(
    '/api/paperless/documents/search',
    {
      params,
      watch: [params],
      immediate: !!toValue(term)
    }
  )
}

/**
 * Computes the download, preview, and thumbnail URLs for a given document.
 *
 * @param id - Reactive or static document ID.
 * @returns An object with `downloadUrl`, `previewUrl`, and `thumbUrl` computed refs.
 */
export function useDocumentUrls(id: MaybeRef<number>) {
  const idVal = computed(() => toValue(id))

  return {
    downloadUrl: computed(() => `/api/paperless/documents/${idVal.value}/download`),
    previewUrl: computed(() => `/api/paperless/documents/${idVal.value}/preview`),
    thumbUrl: computed(() => `/api/paperless/documents/${idVal.value}/thumb`)
  }
}
