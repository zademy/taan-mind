/**
 * @file AI utility helpers for processing assistant messages.
 *
 * Provides functions to merge UI message parts, extract reference concepts
 * from markdown responses, and generate privacy-friendly search URLs.
 * Used by chat-related components to enrich assistant output with inline
 * source links and contextual reference suggestions.
 */

import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'

// ---------------------------------------------------------------------------
// Constants – reference concept extraction tuning knobs
// ---------------------------------------------------------------------------

/** Maximum character length of the markdown text fed into concept extraction. */
const MAX_REFERENCE_TEXT_LENGTH = 5000

/** Maximum character length allowed for a reference candidate label. */
const MAX_REFERENCE_LABEL_LENGTH = 64

/**
 * Connector words (articles, prepositions, conjunctions) in Spanish and English.
 *
 * Used both as stop-words and as glue tokens inside the multi-word concept
 * regex so that phrases like "Machine Learning" or "Red de Neuronas" are
 * captured as a single candidate.
 */
const REFERENCE_CONNECTORS = [
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
  'con',
  'para',
  'of',
  'the',
  'and',
  'for',
  'with'
] as const

/**
 * Stop-words trimmed from the start/end of candidate labels and used to
 * decide whether a label carries enough semantic weight to be useful.
 *
 * Includes all {@link REFERENCE_CONNECTORS} plus common determiners,
 * pronouns, and discourse markers in both Spanish and English.
 */
const REFERENCE_STOP_WORDS = new Set([
  ...REFERENCE_CONNECTORS,
  'a',
  'al',
  'an',
  'ademas',
  'además',
  'as',
  'although',
  'also',
  'aunque',
  'como',
  'cuando',
  'desde',
  'en',
  'entonces',
  'esto',
  'esta',
  'estas',
  'este',
  'estos',
  'if',
  'in',
  'is',
  'it',
  'its',
  'lo',
  'mas',
  'más',
  'no',
  'on',
  'or',
  'por',
  'primero',
  'que',
  'segundo',
  'sin',
  'su',
  'sus',
  'tercero',
  'that',
  'this',
  'to',
  'un',
  'una',
  'unas',
  'unos',
  'when'
])

/**
 * Generic section-heading words (Spanish & English) that should not become
 * reference concepts on their own – e.g. "Conclusión", "Resumen".
 */
const REFERENCE_SECTION_WORDS = new Set([
  'conclusion',
  'conclusión',
  'ejemplo',
  'importante',
  'nota',
  'problema',
  'recomendacion',
  'recomendación',
  'referencia',
  'resumen',
  'respuesta',
  'solucion',
  'solución'
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal representation of a candidate concept before final ranking. */
interface ReferenceCandidate {
  /** Human-readable label shown to the user. */
  label: string
  /** Accumulated relevance score (higher = more relevant). */
  score: number
  /** Earliest character index where this candidate appears in the source text. */
  index: number
}

/** A concept reference ready to be rendered in the chat UI. */
export interface ReferenceConcept {
  /** Display label for the concept. */
  label: string
  /** Privacy-friendly search URL (e.g. DuckDuckGo). */
  url: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Merges consecutive text parts and inlines source-url parts into text
 * so they can be rendered as custom markdown components.
 *
 * This function iterates through the raw UI message parts produced by the
 * AI SDK and produces a simplified array where:
 *
 * - Consecutive `text` parts are concatenated into a single part.
 * - `source-url` parts are converted to inline MDC syntax and appended to
 *   the previous text part, enabling the markdown renderer to display them
 *   as interactive source links.
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

/**
 * Extracts a small set of broad concepts from assistant markdown.
 *
 * The output is intentionally conservative: it favors headings, bold terms,
 * and named concepts instead of every possible keyword.  Extraction follows
 * a multi-pass strategy:
 *
 * 1. **Headings** (`## Heading`) – highest score (6 pts).
 * 2. **Bold terms** (`**term**`) – high score (5 pts).
 * 3. **Multi-word / technical names** via regex – base score (3 pts).
 *
 * Candidates are de-duplicated (normalised to a case- and accent-insensitive
 * key), scored, and the top-N are returned with a DuckDuckGo search URL.
 *
 * @param markdown - Assistant response markdown.
 * @param max      - Maximum number of concepts to return (default 3).
 * @returns An array of {@link ReferenceConcept} objects sorted by relevance.
 */
export function extractReferenceConcepts(markdown: string, max = 3): ReferenceConcept[] {
  const limit = Math.max(0, max)
  if (!markdown.trim() || limit === 0) return []

  const candidates = new Map<string, ReferenceCandidate>()
  const limitedMarkdown = markdown.slice(0, MAX_REFERENCE_TEXT_LENGTH)
  const readableText = stripMarkdownForReferences(limitedMarkdown)

  // Pass 1 – headings (## and lower) get the highest weight
  for (const match of limitedMarkdown.matchAll(/^\s{0,3}#{1,3}\s+(.+)$/gm)) {
    addReferenceCandidate(candidates, match[1] ?? '', 6, match.index ?? 0)
  }

  // Pass 2 – bold spans (**term**) get a high weight
  for (const match of limitedMarkdown.matchAll(/\*\*([^*\n][^*\n]{2,80})\*\*/g)) {
    addReferenceCandidate(candidates, match[1] ?? '', 5, match.index ?? 0)
  }

  // Pass 3 – multi-word / technical names via a Unicode-aware regex
  // Matches sequences like "Machine Learning", "HTTP/2", "Red Neuronal"
  const token = String.raw`(?:[\p{Lu}][\p{L}\d.+#-]{1,}|[A-Z]{2,}[\d.+#-]*|\d+(?:\.\d+)*)`
  const connector = [...REFERENCE_CONNECTORS].sort((a, b) => b.length - a.length).join('|')
  const conceptPattern = new RegExp(
    String.raw`\b${token}(?:\s+(?:(?:${connector})\b|${token})){0,4}`,
    'gu'
  )

  for (const match of readableText.matchAll(conceptPattern)) {
    addReferenceCandidate(candidates, match[0] ?? '', 3, match.index ?? 0)
  }

  // Rank by score (desc), then earliest occurrence, then alphabetical label
  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || a.index - b.index || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(candidate => ({
      label: candidate.label,
      url: getConceptReferenceUrl(candidate.label)
    }))
}

/**
 * Builds a privacy-friendly generic web search URL for a concept.
 *
 * Uses DuckDuckGo because it does not track queries, keeping the user's
 * exploration private.
 *
 * @param concept - Concept label shown in the chat response.
 * @returns A DuckDuckGo search URL for the given concept.
 */
export function getConceptReferenceUrl(concept: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(concept)}`
}

// ---------------------------------------------------------------------------
// Internal helpers – reference candidate management
// ---------------------------------------------------------------------------

/**
 * Adds or updates a reference candidate in the deduplication map.
 *
 * If the normalised key already exists, the score is accumulated and the
 * earliest character index is preserved so that candidates appearing sooner
 * in the text are preferred during tie-breaking.
 *
 * @param candidates - Mutable map of unique key → candidate.
 * @param label      - Raw label text extracted from the markdown.
 * @param score      - Base score for this extraction pass (6 / 5 / 3).
 * @param index      - Character offset where the match was found.
 */
function addReferenceCandidate(
  candidates: Map<string, ReferenceCandidate>,
  label: string,
  score: number,
  index: number
) {
  const cleanLabel = cleanReferenceLabel(label)
  if (!isUsefulReferenceLabel(cleanLabel)) return

  const key = normalizeReferenceKey(cleanLabel)
  const nextScore = score + getReferenceLabelBonus(cleanLabel)
  const existing = candidates.get(key)

  // Accumulate score if we have already seen this concept
  if (existing) {
    existing.score += nextScore
    existing.index = Math.min(existing.index, index)
    return
  }

  candidates.set(key, {
    label: cleanLabel,
    score: nextScore,
    index
  })
}

/**
 * Cleans a raw extracted label by removing markdown syntax and trimming
 * noise such as surrounding punctuation and edge stop-words.
 *
 * @param label - Raw label text potentially containing markdown.
 * @returns A sanitised, trimmed label no longer than {@link MAX_REFERENCE_LABEL_LENGTH}.
 */
function cleanReferenceLabel(label: string): string {
  let cleaned = label
    .replace(/:source-link\{[^}]+\}/g, ' ') // Remove custom MDC source-link components
    .replace(/\{[^}]*\}/g, ' ') // Remove any remaining MDC attribute braces
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // Remove image syntax ![alt](url)
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // Convert links [text](url) → text
    .replace(/[`*_~#>|]/g, ' ') // Strip inline formatting characters
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .replace(/^[()[\]{}"'""''¿¡.,:;!?-]+|[()[\]{}"'""''.,:;!?-]+$/g, '') // Strip leading/trailing punctuation
    .trim()

  // Remove stop-words from the start and end of the label
  cleaned = removeEdgeStopWords(cleaned)

  return cleaned.slice(0, MAX_REFERENCE_LABEL_LENGTH).trim()
}

/**
 * Strips markdown syntax from a text to produce a plain readable string
 * suitable for the multi-word concept regex pass.
 *
 * Fenced code blocks, inline code, images, links, and URLs are all removed.
 *
 * @param markdown - Raw markdown string.
 * @returns A plain-text version of the markdown.
 */
function stripMarkdownForReferences(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // Remove fenced code blocks
    .replace(/`[^`]*`/g, ' ') // Remove inline code
    .replace(/:source-link\{[^}]+\}/g, ' ') // Remove custom MDC source-link components
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // Remove image syntax
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // Convert links → text
    .replace(/https?:\/\/\S+/g, ' ') // Remove bare URLs
    .replace(/[#>*_~|]/g, ' ') // Strip remaining markdown punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}

/**
 * Removes stop-words from the start and end of a label while preserving
 * at least one word.  This avoids candidates like "de la Machine Learning"
 * or "Machine Learning y".
 *
 * @param label - Space-separated word string.
 * @returns The label with leading/trailing stop-words removed.
 */
function removeEdgeStopWords(label: string): string {
  const words = label.split(/\s+/)

  // Trim stop-words from the beginning
  while (words.length > 1 && REFERENCE_STOP_WORDS.has(normalizeReferenceKey(words[0] ?? ''))) {
    words.shift()
  }

  // Trim stop-words from the end
  while (
    words.length > 1 &&
    REFERENCE_STOP_WORDS.has(normalizeReferenceKey(words[words.length - 1] ?? ''))
  ) {
    words.pop()
  }

  return words.join(' ')
}

/**
 * Determines whether a cleaned label is useful as a reference concept.
 *
 * A label is rejected when it is too short/long, looks like a URL or email,
 * is only a number, is a generic section heading, or consists entirely of
 * stop-words.  Single-word labels are accepted only when they carry a
 * technical signal (all-caps acronym, digit, or special char) or are at
 * least 4 characters long.
 *
 * @param label - Already-cleaned candidate label.
 * @returns `true` if the label should be considered as a reference concept.
 */
function isUsefulReferenceLabel(label: string): boolean {
  // Reject trivially short or excessively long labels
  if (label.length < 3 || label.length > MAX_REFERENCE_LABEL_LENGTH) return false
  // Reject URLs and email-like fragments
  if (/https?:\/\//i.test(label) || /@/.test(label)) return false
  // Reject bare numeric strings like "42" or "3.14"
  if (/^\d+(?:\.\d+)?$/.test(label)) return false

  const key = normalizeReferenceKey(label)
  // Reject generic section headings (e.g. "Conclusión", "Resumen")
  if (REFERENCE_SECTION_WORDS.has(key)) return false

  const words = key.split(/\s+/).filter(Boolean)
  // Reject labels that are empty or contain only stop-words
  if (!words.length || words.every(word => REFERENCE_STOP_WORDS.has(word))) return false

  // Single-word labels need extra signals to be considered useful
  const hasTechnicalSignal = /[A-Z]{2,}|\d|[+#-]/.test(label)
  const hasMultipleWords = words.length > 1

  return hasMultipleWords || hasTechnicalSignal || label.length >= 4
}

/**
 * Computes a small bonus score based on structural signals in the label.
 *
 * Multi-word labels and labels containing acronyms or technical characters
 * (digits, `+`, `#`, `-`) receive a higher bonus.
 *
 * @param label - Cleaned candidate label.
 * @returns A non-negative bonus to add to the base score.
 */
function getReferenceLabelBonus(label: string): number {
  let bonus = 0
  if (/\s/.test(label)) bonus += 2 // Multi-word phrase
  if (/[A-Z]{2,}/.test(label)) bonus += 1 // Contains an acronym
  if (/\d|[+#-]/.test(label)) bonus += 1 // Contains a technical character
  return bonus
}

/**
 * Normalises a label into a stable deduplication key by stripping diacritics,
 * lowercasing, and collapsing non-alphanumeric characters.
 *
 * Example: `"Árbol Binario"` → `"arbol binario"`.
 *
 * @param label - Raw or cleaned label string.
 * @returns A normalised key suitable for map lookups.
 */
function normalizeReferenceKey(label: string): string {
  return label
    .normalize('NFD') // Decompose accented chars into base + diacritic
    .replace(/\p{Diacritic}/gu, '') // Strip combining diacritical marks
    .toLowerCase()
    .replace(/[^\p{L}\d+#.-]+/gu, ' ') // Replace non-word chars with spaces
    .trim()
}
