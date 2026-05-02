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

  async function create(body: CustomPersonalityPayload) {
    const personality = await $fetch<CustomPersonality>('/api/personalities', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })
    await refresh()
    return personality
  }

  async function update(id: string, body: CustomPersonalityPayload) {
    const personality = await $fetch<CustomPersonality>(`/api/personalities/${id}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body
    })
    await refresh()
    return personality
  }

  async function remove(id: string) {
    await $fetch(`/api/personalities/${id}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
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
