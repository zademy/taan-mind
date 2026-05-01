/**
 * Characters and patterns to clean from OCR-extracted text.
 * These are commonly introduced by PDF editors, Word processors, and OCR engines.
 */

// Map of problematic characters to their replacements
const CHAR_REPLACEMENTS: [RegExp, string][] = [
  // Pilcrow / paragraph marks
  [/¶/g, ''],
  // Section signs
  [/§/g, ''],
  // Non-breaking spaces (U+00A0)
  [/\u00A0/g, ' '],
  // Zero-width spaces (U+200B)
  [/\u200B/g, ''],
  // Zero-width non-joiner (U+200C)
  [/\u200C/g, ''],
  // Zero-width joiner (U+200D)
  [/\u200D/g, ''],
  // Word joiner (U+2060)
  [/\u2060/g, ''],
  // Soft hyphen (U+00AD)
  [/\u00AD/g, ''],
  // Left-to-right mark (U+200E)
  [/\u200E/g, ''],
  // Right-to-left mark (U+200F)
  [/\u200F/g, ''],
  // Byte order mark (U+FEFF)
  [/\uFEFF/g, ''],
  // Object replacement character (U+FFFC)
  [/\uFFFC/g, ''],
  // Replacement character (U+FFFD)
  [/\uFFFD/g, ''],
  // Various dashes to standard hyphen
  [/[\u2013\u2014\u2015]/g, '-'],
  // Smart quotes to regular quotes
  [/[\u2018\u2019\u201A]/g, '\''],
  [/[\u201C\u201D\u201E]/g, '"'],
  // Ellipsis character to three dots
  [/\u2026/g, '...'],
  // Bullet character (U+2022) — keep but ensure space after
  // No-break hyphen
  [/\u2011/g, '-'],
  // Figure space, punctuation space, thin space, hair space, narrow no-break space, medium mathematical space
  [/[\u2007\u2008\u2009\u200A\u202F\u205F]/g, ' '],
  // En space, em space (U+2002, U+2003)
  [/[\u2002\u2003]/g, ' '],
  // Ideographic space (U+3000)
  [/\u3000/g, ' '],
  // Control characters (except newline, carriage return, tab)
  // eslint-disable-next-line no-control-regex
  [/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''],
  // Multiple consecutive spaces → single space
  [/ {2,}/g, ' '],
  // Multiple consecutive newlines (3+) → double newline
  [/\n{3,}/g, '\n\n'],
  // Trailing spaces on lines
  [/ +\n/g, '\n']
]

/**
 * Cleans special/invisible characters from text content.
 * Removes paragraph marks, zero-width characters, control characters,
 * normalizes spaces, quotes, and dashes.
 */
export function cleanText(text: string): string {
  let result = text
  for (const [pattern, replacement] of CHAR_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result.trim()
}
