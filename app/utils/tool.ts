import type { getToolName } from 'ai'

/** Represents a web source reference extracted from search tool output. */
export interface Source {
  url: string
  title?: string
}

/** Grounding chunk structure returned by Google search results. */
interface GoogleGroundingChunk {
  web?: { uri?: string, title?: string }
}

/** Unified structure representing search tool output from different providers. */
interface SearchOutput {
  sources?: { url: string, type?: string }[]
  groundingChunks?: GoogleGroundingChunk[]
  groundingMetadata?: { groundingChunks?: GoogleGroundingChunk[] }
}

/** Inferred type for a tool invocation part from the AI SDK. */
type ToolPart = Parameters<typeof getToolName>[0]

/**
 * Extracts the search query string from a tool invocation part.
 *
 * @param part - The tool invocation part.
 * @returns The search query, or `undefined` if not present.
 */
export function getSearchQuery(part: ToolPart): string | undefined {
  return (part.input as { query?: string } | undefined)?.query
}

/**
 * Extracts source references from a search tool invocation result.
 *
 * Supports three provider formats:
 * - **Anthropic**: Array of `{ url, title }` objects
 * - **OpenAI**: `{ sources: [{ type, url }] }`
 * - **Google**: Grounding chunks with `{ web: { uri, title } }`
 *
 * @param part - The tool invocation part containing the output.
 * @returns An array of normalized `Source` objects.
 */
export function getSources(part: ToolPart): Source[] {
  const output = part.output
  if (!output) return []

  // Anthropic: array of { url, title }
  if (Array.isArray(output)) {
    return output.filter((s: Source) => s.url).map((s: Source) => ({ url: s.url, title: s.title }))
  }

  const typed = output as SearchOutput

  // OpenAI: { sources: [{ type: 'url', url }] }
  if (typed.sources) {
    return typed.sources.filter(s => s.url).map(s => ({ url: s.url }))
  }

  // Google: grounding chunks with { web: { uri, title } }
  const chunks = typed.groundingChunks ?? typed.groundingMetadata?.groundingChunks
  if (chunks) {
    return chunks.filter(c => c.web?.uri).map(c => ({ url: c.web!.uri!, title: c.web!.title }))
  }

  return []
}

/**
 * Converts a source URL into an inline MDC component string for rendering.
 *
 * The resulting string is consumed by the Comark renderer to display
 * a styled source link with a favicon.
 *
 * @param url - The source URL to convert.
 * @returns An inline MDC component string.
 */
export function sourceToInlineMdc(url: string): string {
  const domain = getDomain(url)
  const favicon = getFaviconUrl(url)
  // Escape double quotes to prevent breaking the MDC attributes
  const safeUrl = url.replace(/"/g, '&quot;')
  const safeFavicon = favicon.replace(/"/g, '&quot;')

  return ` :source-link{url="${safeUrl}" favicon="${safeFavicon}" label="${domain}"}`
}
