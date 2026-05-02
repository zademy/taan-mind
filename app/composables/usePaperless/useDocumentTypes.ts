import type { PaperlessDocumentType, PaperlessPaginatedResponse } from '~~/shared/types/paperless'

/** Options for the {@link useDocumentTypes} composable. */
interface DocumentTypeListOptions {
  /** Page number (1-based). */
  page?: Ref<number> | number
  /** Number of items per page. */
  pageSize?: Ref<number> | number
  /** Field to order results by (e.g. `'name'`, `'-name'`). */
  ordering?: Ref<string> | string
  /** When `true`, uses `useLazyFetch` instead of `useFetch` (non-blocking). */
  lazy?: boolean
}

/**
 * Fetches a paginated list of document types from the Paperless-ngx API.
 *
 * @param options - Pagination, ordering, and fetch-mode options.
 * @returns A `useFetch` / `useLazyFetch` result with the paginated document-type list.
 */
export function useDocumentTypes(options: DocumentTypeListOptions = {}) {
  const { page = 1, pageSize = 25, ordering = 'name', lazy = false } = options

  const query = computed(() => ({
    page: toValue(page),
    page_size: toValue(pageSize),
    ordering: toValue(ordering)
  }))

  const fetchFn = lazy ? useLazyFetch : useFetch

  return fetchFn<PaperlessPaginatedResponse<PaperlessDocumentType>>(
    '/api/paperless/document-types',
    {
      query
    }
  )
}

/**
 * Fetches a single document type by its ID.
 *
 * @param id - Reactive or static document-type ID.
 * @returns A `useFetch` result with the document-type data.
 */
export function useDocumentType(id: MaybeRef<number>) {
  return useFetch<PaperlessDocumentType>(() => `/api/paperless/document-types/${toValue(id)}`)
}

/**
 * Provides mutation helpers for creating, updating, and deleting document types.
 *
 * All mutations automatically include the CSRF token header required by the API.
 *
 * @returns An object with `create`, `update`, and `remove` async functions.
 */
export function useDocumentTypeMutations() {
  const { csrf, headerName } = useCsrf()

  /**
   * Creates a new document type.
   *
   * @param body - The document-type payload (at minimum a `name`).
   * @returns The newly created document type.
   */
  async function create(body: { name: string }) {
    return await $fetch<PaperlessDocumentType>('/api/paperless/document-types', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Partially updates an existing document type.
   *
   * @param id - The document-type ID to update.
   * @param body - The fields to update.
   * @returns The updated document type.
   */
  async function update(id: number, body: Partial<{ name: string }>) {
    return await $fetch<PaperlessDocumentType>(`/api/paperless/document-types/${id}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Deletes a document type by ID.
   *
   * @param id - The document-type ID to delete.
   */
  async function remove(id: number) {
    return await $fetch(`/api/paperless/document-types/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
  }

  return { create, update, remove }
}
