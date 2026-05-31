import type { PersonalityId } from '#shared/utils/personalities'
import {
  DEFAULT_PERSONALITY,
  PERSONALITIES,
  isSupportedPersonality,
  toCustomPersonalityValue
} from '#shared/utils/personalities'

/**
 * Composable that manages the selected AI personality.
 *
 * Persists the personality selection in a cookie so it survives page reloads.
 * Falls back to the default personality if the stored value is no longer supported.
 *
 * @returns An object containing the available `personalities` list and the reactive `personality` selection.
 *
 * @module app/composables
 */
export function usePersonality() {
  /** Currently selected personality, persisted as a cookie. */
  const personality = useCookie<PersonalityId>('personality', {
    default: () => DEFAULT_PERSONALITY
  })

  /** Custom personalities fetched from the server for the current session. */
  const { customPersonalities, status, refresh } = useCustomPersonalities()

  // Reset malformed cookie values immediately. Custom IDs are verified after fetch completes.
  if (!isSupportedPersonality(personality.value as string)) {
    personality.value = DEFAULT_PERSONALITY
  }

  /** Maps server-side custom personalities into UI-selectable options. */
  const customPersonalityOptions = computed(() =>
    (customPersonalities.value ?? []).map(customPersonality => ({
      label: customPersonality.label,
      value: toCustomPersonalityValue(customPersonality.id),
      icon: 'i-lucide-sparkles',
      description: 'Custom markdown personality',
      custom: true
    }))
  )

  /** Combined list of built-in and custom personality options for the selector. */
  const personalities = computed(() => [...PERSONALITIES, ...customPersonalityOptions.value])

  // Once custom personalities are loaded, verify the stored selection is still valid.
  // Falls back to the default personality if the selected one was deleted or is unavailable.
  watch(
    [personalities, status],
    () => {
      // Wait until the custom personalities fetch completes before validating
      if (status.value === 'pending') return
      if (!personalities.value.some(option => option.value === personality.value)) {
        personality.value = DEFAULT_PERSONALITY
      }
    },
    { immediate: true }
  )

  return {
    personalities,
    customPersonalities,
    refreshCustomPersonalities: refresh,
    personality
  }
}
