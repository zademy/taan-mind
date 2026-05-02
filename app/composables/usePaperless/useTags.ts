import type { PaperlessPaginatedResponse, PaperlessTag } from '~~/shared/types/paperless'

/** Options for the {@link useTags} composable. */
interface TagListOptions {
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
 * Fetches a paginated list of tags from the Paperless-ngx API.
 *
 * @param options - Pagination, ordering, and fetch-mode options.
 * @returns A `useFetch` / `useLazyFetch` result with the paginated tag list.
 */
export function useTags(options: TagListOptions = {}) {
  const { page = 1, pageSize = 25, ordering = 'name', lazy = false } = options

  const query = computed(() => ({
    page: toValue(page),
    page_size: toValue(pageSize),
    ordering: toValue(ordering)
  }))

  const fetchFn = lazy ? useLazyFetch : useFetch

  return fetchFn<PaperlessPaginatedResponse<PaperlessTag>>('/api/paperless/tags', {
    query
  })
}

/**
 * Fetches a single tag by its ID.
 *
 * @param id - Reactive or static tag ID.
 * @returns A `useFetch` result with the tag data.
 */
export function useTag(id: MaybeRef<number>) {
  return useFetch<PaperlessTag>(() => `/api/paperless/tags/${toValue(id)}`)
}

/**
 * Provides mutation helpers for creating, updating, and deleting tags.
 *
 * All mutations automatically include the CSRF token header required by the API.
 *
 * @returns An object with `create`, `update`, and `remove` async functions.
 */
export function useTagMutations() {
  const { csrf, headerName } = useCsrf()

  /**
   * Creates a new tag.
   *
   * @param body - The tag payload (at minimum a `name`; optionally `color` and `is_inbox_tag`).
   * @returns The newly created tag.
   */
  async function create(body: { name: string; color?: string; is_inbox_tag?: boolean }) {
    return await $fetch<PaperlessTag>('/api/paperless/tags', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Partially updates an existing tag.
   *
   * @param id - The tag ID to update.
   * @param body - The fields to update.
   * @returns The updated tag.
   */
  async function update(
    id: number,
    body: Partial<{ name: string; color: string; is_inbox_tag: boolean }>
  ) {
    return await $fetch<PaperlessTag>(`/api/paperless/tags/${id}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body
    })
  }

  /**
   * Deletes a tag by ID.
   *
   * @param id - The tag ID to delete.
   */
  async function remove(id: number) {
    return await $fetch(`/api/paperless/tags/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
  }

  return { create, update, remove }
}
