import type { PersonalityId } from '#shared/utils/personalities'
import { DEFAULT_PERSONALITY, PERSONALITIES, isSupportedPersonality } from '#shared/utils/personalities'

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
  const personality = useCookie<PersonalityId>('personality', { default: () => DEFAULT_PERSONALITY })

  // Reset to default if the stored personality is no longer in the supported list
  if (!isSupportedPersonality(personality.value as string)) {
    personality.value = DEFAULT_PERSONALITY
  }

  return {
    personalities: PERSONALITIES,
    personality
  }
}
