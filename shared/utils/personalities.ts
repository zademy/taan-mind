/** Static personality identifiers bundled with the application. */
export type DefaultPersonalityId = 'friendly' | 'professional' | 'enthusiastic'

/** Persisted custom personality identifier used in chat records. */
export type CustomPersonalityId = `custom:${string}`

/** Union of all supported personality identifiers. */
export type PersonalityId = DefaultPersonalityId | CustomPersonalityId

/** Maximum custom personalities an anonymous user can create. */
export const MAX_CUSTOM_PERSONALITIES = 3

/** Maximum markdown prompt length for a custom personality. */
export const MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH = 1200

/** Represents a selectable personality option in the UI. */
export interface PersonalityOption {
  /** Human-readable display name. */
  label: string
  /** Unique personality identifier. */
  value: PersonalityId
  /** Lucide icon class for the personality. */
  icon: string
  /** Short description shown in the UI. */
  description: string
  /** System prompt injected into the AI context to set the personality. */
  systemPrompt?: string
  /** Whether this option comes from user settings instead of defaults. */
  custom?: boolean
}

/** A persisted custom personality owned by the current anonymous user. */
export interface CustomPersonality {
  /** Database UUID. */
  id: string
  /** Human-readable display name in the selector. */
  label: string
  /** Markdown-formatted system prompt. */
  prompt: string
  /** ISO timestamp from the server. */
  createdAt: string
  /** ISO timestamp from the server. */
  updatedAt: string
}

/** Static AI personalities selectable by every user. */
export const PERSONALITIES: (PersonalityOption & {
  value: DefaultPersonalityId
  systemPrompt: string
})[] = [
  {
    label: 'Friendly',
    value: 'friendly',
    icon: 'i-lucide-smile',
    description: 'Warm and approachable',
    systemPrompt: `You are a warm, friendly, and approachable AI assistant. You genuinely care about helping people and always maintain a positive, encouraging tone.

**PERSONALITY:**
- Use a conversational and warm tone, like talking to a good friend
- Add occasional light humor when appropriate
- Be encouraging and supportive
- Use simple, accessible language
- Show empathy and understanding`
  },
  {
    label: 'Professional',
    value: 'professional',
    icon: 'i-lucide-briefcase',
    description: 'Formal and precise',
    systemPrompt: `You are a highly professional and precise AI assistant. You deliver structured, accurate, and business-ready responses.

**PERSONALITY:**
- Maintain a formal yet clear communication style
- Prioritize accuracy and completeness
- Use structured formats when presenting information
- Be direct and efficient with responses
- Provide actionable insights and recommendations`
  },
  {
    label: 'Enthusiastic',
    value: 'enthusiastic',
    icon: 'i-lucide-rocket',
    description: 'Energetic and motivating',
    systemPrompt: `You are an energetic, enthusiastic, and highly motivating AI assistant. You bring excitement and positive energy to every interaction.

**PERSONALITY:**
- Be energetic and passionate about every topic
- Use dynamic and engaging language
- Celebrate progress and achievements
- Inspire curiosity and exploration
- Make learning and problem-solving feel exciting`
  }
]

/** The default personality used when no selection has been made. */
export const DEFAULT_PERSONALITY = PERSONALITIES[0]!.value

/**
 * Builds the stored selector value for a custom personality.
 *
 * @param id - Database UUID of the custom personality.
 * @returns A namespaced custom personality value.
 */
export function toCustomPersonalityValue(id: string): CustomPersonalityId {
  return `custom:${id}`
}

/**
 * Type guard that checks whether a string references a custom personality.
 *
 * @param value - The string to check.
 * @returns `true` when the value uses the custom personality namespace.
 */
export function isCustomPersonalityId(value: string): value is CustomPersonalityId {
  return value.startsWith('custom:') && value.length > 'custom:'.length
}

/**
 * Extracts the database UUID from a custom personality selector value.
 *
 * @param value - The custom personality selector value.
 * @returns The database UUID without the namespace.
 */
export function getCustomPersonalityId(value: CustomPersonalityId): string {
  return value.slice('custom:'.length)
}

/**
 * Type guard that checks whether a string is a static bundled personality ID.
 *
 * @param value - The string to check.
 * @returns `true` if the value matches a bundled personality ID.
 */
export function isDefaultPersonality(value: string): value is DefaultPersonalityId {
  return PERSONALITIES.some(p => p.value === value)
}

/**
 * Type guard that checks whether a string has a supported personality format.
 *
 * @param value - The string to check.
 * @returns `true` if the value is bundled or namespaced as custom.
 */
export function isSupportedPersonality(value: string): value is PersonalityId {
  return isDefaultPersonality(value) || isCustomPersonalityId(value)
}

/**
 * Retrieves the system prompt for a bundled personality.
 *
 * @param id - The personality identifier.
 * @returns The system prompt string, falling back to the default personality's prompt.
 */
export function getPersonalityPrompt(id: DefaultPersonalityId | string): string {
  return PERSONALITIES.find(p => p.value === id)?.systemPrompt ?? PERSONALITIES[0]!.systemPrompt
}
