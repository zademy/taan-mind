import type { PaperlessCorrespondent, PaperlessPaginatedResponse } from '~~/shared/types/paperless'

/** Options for the {@link useCorrespondents} composable. */
interface CorrespondentListOptions {
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
 * Fetches a paginated list of correspondents from the Paperless-ngx API.
 *
 * @param options - Pagination, ordering, and fetch-mode options.
 * @returns A `useFetch` / `useLazyFetch` result with the paginated correspondent list.
 */
export function useCorrespondents(options: CorrespondentListOptions = {}) {
  const { page = 1, pageSize = 25, ordering = 'name', lazy = false } = options

  const query = computed(() => ({
    page: toValue(page),
    page_size: toValue(pageSize),
    ordering: toValue(ordering)
  }))

  const fetchFn = lazy ? useLazyFetch : useFetch

  return fetchFn<PaperlessPaginatedResponse<PaperlessCorrespondent>>('/api/paperless/correspondents', {
    query
  })
}

/**
 * Fetches a single correspondent by its ID.
 *
 * @param id - Reactive or static correspondent ID.
 * @returns A `useFetch` result with the correspondent data.
 */
export function useCorrespondent(id: MaybeRef<number>) {
  return useFetch<PaperlessCorrespondent>(() => `/api/paperless/correspondents/${toValue(id)}`)
}

/**
 * Provides mutation helpers for creating, updating, and deleting correspondents.
 *
 * All mutations automatically include the CSRF token header required by the API.
 *
 * @returns An object with `create`, `update`, and `remove` async functions.
 */
export function useCorrespondentMutations() {
  const { csrf, headerName } = useCsrf()

  /**
   * Creates a new correspondent.
   *
   * @param body - The correspondent payload (at minimum a `name`).
   * @returns The newly created correspondent.
   */
  async function create(body: { name: string }) {
    return await $fetch<PaperlessCorrespondent>('/api/paperless/correspondents', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Partially updates an existing correspondent.
   *
   * @param id - The correspondent ID to update.
   * @param body - The fields to update.
   * @returns The updated correspondent.
   */
  async function update(id: number, body: Partial<{ name: string }>) {
    return await $fetch<PaperlessCorrespondent>(`/api/paperless/correspondents/${id}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Deletes a correspondent by ID.
   *
   * @param id - The correspondent ID to delete.
   */
  async function remove(id: number) {
    return await $fetch(`/api/paperless/correspondents/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
  }

  return { create, update, remove }
}
