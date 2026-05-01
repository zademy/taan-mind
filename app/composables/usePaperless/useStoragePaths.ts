import type { PaperlessPaginatedResponse, PaperlessStoragePath } from '~~/shared/types/paperless'

/** Options for the {@link useStoragePaths} composable. */
interface StoragePathListOptions {
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
 * Fetches a paginated list of storage paths from the Paperless-ngx API.
 *
 * Automatically re-fetches when query parameters change.
 *
 * @param options - Pagination, ordering, and fetch-mode options.
 * @returns A `useFetch` / `useLazyFetch` result with the paginated storage-path list.
 */
export function useStoragePaths(options: StoragePathListOptions = {}) {
  const query = computed(() => ({
    page: toValue(options.page) ?? 1,
    page_size: toValue(options.pageSize) ?? 25,
    ordering: toValue(options.ordering) ?? 'name'
  }))

  const fetcher = options.lazy ? useLazyFetch : useFetch

  return fetcher<PaperlessPaginatedResponse<PaperlessStoragePath>>(
    '/api/paperless/storage-paths',
    { query, watch: [query] }
  )
}

/**
 * Fetches a single storage path by its ID.
 *
 * Automatically re-fetches when the ID changes.
 *
 * @param id - Reactive or static storage-path ID.
 * @returns A `useFetch` result with the storage-path data.
 */
export function useStoragePath(id: MaybeRef<number>) {
  const resolvedId = computed(() => toValue(id))

  return useFetch<PaperlessStoragePath>(
    computed(() => `/api/paperless/storage-paths/${resolvedId.value}`),
    { watch: [resolvedId] }
  )
}
