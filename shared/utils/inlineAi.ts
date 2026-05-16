/**
 * Shared inline AI action registry.
 *
 * Kept in shared code so client menus and server validation stay in sync.
 */

export const INLINE_AI_MIN_CHARACTERS = 30
export const INLINE_AI_MAX_INPUT_CHARACTERS = 8000

export type InlineAIActionCategory = 'writing' | 'document'

export interface InlineAIAction {
  /** Stable action identifier sent to the inline AI endpoint. */
  value: string
  /** User-facing menu label. */
  label: string
  /** Short menu description explaining the transformation. */
  description: string
  /** Nuxt UI / Iconify icon class. */
  icon: string
  /** Menu grouping. */
  category: InlineAIActionCategory
}

export const INLINE_AI_ACTIONS = [
  {
    value: 'improve_writing',
    label: 'Improve writing',
    description: 'Polish grammar, clarity, and flow.',
    icon: 'i-lucide-sparkles',
    category: 'writing'
  },
  {
    value: 'formalize',
    label: 'Formalize tone',
    description: 'Make it sound more professional.',
    icon: 'i-lucide-briefcase-business',
    category: 'writing'
  },
  {
    value: 'simplify',
    label: 'Simplify',
    description: 'Use clearer, easier language.',
    icon: 'i-lucide-wand-sparkles',
    category: 'writing'
  },
  {
    value: 'expand',
    label: 'Expand',
    description: 'Add helpful detail without changing intent.',
    icon: 'i-lucide-unfold-vertical',
    category: 'writing'
  },
  {
    value: 'shorten',
    label: 'Shorten',
    description: 'Make it concise while preserving meaning.',
    icon: 'i-lucide-fold-vertical',
    category: 'writing'
  },
  {
    value: 'translate_to_english',
    label: 'Translate to English',
    description: 'Translate or naturalize the text in English.',
    icon: 'i-lucide-languages',
    category: 'writing'
  },
  {
    value: 'continue_writing',
    label: 'Continue writing',
    description: 'Continue from the current draft.',
    icon: 'i-lucide-list-plus',
    category: 'writing'
  },
  {
    value: 'summarize',
    label: 'Summarize',
    description: 'Create a compact summary.',
    icon: 'i-lucide-file-text',
    category: 'document'
  },
  {
    value: 'extract_entities',
    label: 'Extract entities',
    description: 'Find names, dates, RFCs, and amounts.',
    icon: 'i-lucide-scan-search',
    category: 'document'
  },
  {
    value: 'generate_tags',
    label: 'Generate tags',
    description: 'Suggest semantic labels.',
    icon: 'i-lucide-tags',
    category: 'document'
  },
  {
    value: 'explain_document',
    label: 'Explain simply',
    description: 'Explain the content in plain language.',
    icon: 'i-lucide-message-circle-question',
    category: 'document'
  },
  {
    value: 'detect_risks',
    label: 'Detect risks',
    description: 'Highlight possible obligations or issues.',
    icon: 'i-lucide-shield-alert',
    category: 'document'
  },
  {
    value: 'generate_tasks',
    label: 'Generate tasks',
    description: 'Turn the text into action items.',
    icon: 'i-lucide-list-checks',
    category: 'document'
  }
] as const satisfies readonly InlineAIAction[]

export type InlineAIActionId = (typeof INLINE_AI_ACTIONS)[number]['value']

const INLINE_AI_ACTION_IDS = new Set<string>(INLINE_AI_ACTIONS.map(action => action.value))

export function isInlineAIActionId(value: string): value is InlineAIActionId {
  return INLINE_AI_ACTION_IDS.has(value)
}

export function getInlineAIAction(value: InlineAIActionId) {
  return INLINE_AI_ACTIONS.find(action => action.value === value)
}

export function getInlineAIActionsByCategory(category: InlineAIActionCategory) {
  return INLINE_AI_ACTIONS.filter(action => action.category === category)
}
