import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'

/**
 * Merges consecutive text parts and inlines source-url parts into text
 * so they can be rendered as custom markdown components.
 *
 * @param parts - The array of UI message parts to merge.
 * @returns A new array with merged text parts and inlined source links.
 */
export function getMergedParts(parts: UIMessage['parts']): UIMessage['parts'] {
  const result: UIMessage['parts'] = []
  for (const part of parts) {
    const prev = result[result.length - 1]
    // Inline source URLs as custom MDC components appended to the previous text part
    if (part.type === 'source-url') {
      if (prev && isTextUIPart(prev)) {
        result[result.length - 1] = { type: 'text', text: prev.text + sourceToInlineMdc(part.url) }
      }
      continue
    }
    // Merge consecutive text parts into a single part
    if (isTextUIPart(part) && prev && isTextUIPart(prev)) {
      result[result.length - 1] = { type: 'text', text: prev.text + part.text }
    } else {
      result.push(part)
    }
  }
  return result
}
