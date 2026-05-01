import type { PaperlessPaginatedResponse, PaperlessTask } from '~~/shared/types/paperless'

/**
 * Fetches the list of background tasks from the Paperless-ngx API.
 *
 * Uses `useLazyFetch` so the request does not block navigation.
 *
 * @returns A `useLazyFetch` result with the paginated task list.
 */
export function usePaperlessTasks() {
  return useLazyFetch<PaperlessPaginatedResponse<PaperlessTask>>(
    '/api/paperless/tasks'
  )
}

/**
 * Fetches a single background task by its ID.
 *
 * Automatically re-fetches when the task ID changes.
 *
 * @param taskId - Reactive or static task ID (UUID string).
 * @returns A `useFetch` result with the task data.
 */
export function usePaperlessTask(taskId: MaybeRef<string>) {
  const resolvedId = computed(() => toValue(taskId))

  return useFetch<PaperlessTask>(
    computed(() => `/api/paperless/tasks/${resolvedId.value}`),
    { watch: [resolvedId] }
  )
}
