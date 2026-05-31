import type { CustomPersonality } from '#shared/utils/personalities'

/** Payload accepted when creating or updating a custom personality. */
export interface CustomPersonalityPayload {
  /** Human-readable selector label. */
  label: string
  /** Markdown-formatted system prompt. */
  prompt: string
}

/**
 * Fetches and mutates custom personalities for the current anonymous session.
 *
 * Built-in personalities are intentionally excluded from this API.
 * They live in shared code and cannot be edited from settings.
 *
 * @module app/composables
 */
export function useCustomPersonalities() {
  const { csrf, headerName } = useCsrf()

  const {
    data: customPersonalities,
    refresh,
    status,
    error
  } = useFetch<CustomPersonality[]>('/api/personalities', {
    key: 'custom-personalities',
    default: () => []
  })

  /**
   * Creates a new custom personality for the current session.
   *
   * @param body - The personality payload containing label and prompt.
   * @returns The newly created personality from the server.
   */
  async function create(body: CustomPersonalityPayload) {
    const personality = await $fetch<CustomPersonality>('/api/personalities', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })
    // Refresh the reactive list so the UI updates immediately
    await refresh()
    return personality
  }

  /**
   * Updates an existing custom personality owned by the current session.
   *
   * @param id - The database UUID of the custom personality.
   * @param body - The updated personality payload.
   * @returns The updated personality from the server.
   */
  async function update(id: string, body: CustomPersonalityPayload) {
    const personality = await $fetch<CustomPersonality>(`/api/personalities/${id}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body
    })
    // Refresh the reactive list so the UI updates immediately
    await refresh()
    return personality
  }

  /**
   * Deletes a custom personality owned by the current session.
   *
   * @param id - The database UUID of the custom personality to delete.
   */
  async function remove(id: string) {
    await $fetch(`/api/personalities/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
    // Refresh the reactive list so the UI updates immediately
    await refresh()
  }

  return {
    customPersonalities,
    refresh,
    status,
    error,
    create,
    update,
    remove
  }
}
