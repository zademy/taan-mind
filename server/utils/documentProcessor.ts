import { generateText } from 'ai'
import type { H3Event } from 'h3'

/**
 * AI-extracted metadata suggestions for a document.
 * All fields are optional since the AI may not be able to determine every field.
 */
export interface ExtractedMetadata {
  /** Suggested document title. */
  suggestedTitle?: string
  /** Suggested classification tags. */
  suggestedTags?: string[]
  /** Suggested correspondent (sender/creator). */
  suggestedCorrespondent?: string
  /** Suggested document type (invoice, receipt, etc.). */
  suggestedDocumentType?: string
}

/**
 * Uses AI to clean and format raw OCR-extracted text.
 *
 * @param rawText - The raw text extracted from OCR.
 * @param documentTitle - The document title, provided for context.
 * @param event - The H3 event for runtime config access.
 * @returns The cleaned and formatted text.
 */
export async function formatContentWithAI(rawText: string, documentTitle: string, event: H3Event): Promise<string> {
  const model = resolveLanguageModel('minimax/MiniMax-M2.7', event)

  const { text } = await generateText({
    model,
    system: `You are a document text formatter. Your task is to clean and format OCR-extracted text from a document titled "${documentTitle}".

Instructions:
- Fix OCR recognition errors such as broken words, incorrect characters, and misplaced spacing
- Preserve ALL original information — do not remove, summarize, or omit any content
- Output clean, well-structured text with proper paragraphs and line breaks
- Do NOT use markdown headings (#, ##, etc.) — just clean paragraphs with proper formatting
- Maintain the original document structure (lists, tables, sections) as closely as possible
- If the text contains numbers, dates, or proper nouns, ensure they are correctly formatted`,
    prompt: rawText
  })

  return text
}

/**
 * Uses AI to analyze document content and suggest metadata.
 *
 * @param formattedContent - The already-formatted document content.
 * @param existingTitle - The current title of the document.
 * @param event - The H3 event for runtime config access.
 * @returns Extracted metadata suggestions.
 */
export async function extractMetadataWithAI(formattedContent: string, existingTitle: string, event: H3Event): Promise<ExtractedMetadata> {
  const model = resolveLanguageModel('minimax/MiniMax-M2.7', event)

  const { text } = await generateText({
    model,
    system: `You are a document metadata extractor. Analyze the provided document content and return a JSON object with the following fields:
- "suggestedTitle": a clear, descriptive title for the document
- "suggestedTags": an array of relevant tags/keywords (max 5)
- "suggestedCorrespondent": who sent or created the document (person or organization)
- "suggestedDocumentType": the type of document (invoice, receipt, letter, report, contract, etc.)

If a field cannot be determined from the content, omit it from the JSON.
Return ONLY the JSON object, no additional text or markdown formatting.`,
    prompt: `Document title: "${existingTitle}"

Document content:
${formattedContent}`
  })

  try {
    return JSON.parse(text) as ExtractedMetadata
  } catch {
    return {}
  }
}
