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
 */
export function usePersonality() {
  /** Currently selected personality, persisted as a cookie. */
  const personality = useCookie<PersonalityId>('personality', {
    default: () => DEFAULT_PERSONALITY
  })
  const { customPersonalities, status, refresh } = useCustomPersonalities()

  // Reset malformed cookie values immediately. Custom IDs are verified after fetch completes.
  if (!isSupportedPersonality(personality.value as string)) {
    personality.value = DEFAULT_PERSONALITY
  }

  const customPersonalityOptions = computed(() =>
    (customPersonalities.value ?? []).map(customPersonality => ({
      label: customPersonality.label,
      value: toCustomPersonalityValue(customPersonality.id),
      icon: 'i-lucide-sparkles',
      description: 'Custom markdown personality',
      custom: true
    }))
  )

  const personalities = computed(() => [...PERSONALITIES, ...customPersonalityOptions.value])

  watch(
    [personalities, status],
    () => {
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
