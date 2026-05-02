import { eq, asc, or } from 'drizzle-orm'
import { consola } from 'consola'
import { createMinimax } from 'vercel-minimax-ai-provider'
import { generateText } from 'ai'
import type { PaperlessDocument } from '~~/shared/types/paperless'
import { cleanText } from '../utils/textCleaner'

/** Configuration required for AI-powered document processing via MiniMax. */
interface DocumentProcessorConfig {
  /** MiniMax API key for content formatting and metadata extraction. */
  minimaxApiKey: string
  /** Optional custom base URL for the MiniMax API. */
  minimaxBaseUrl?: string
}

/**
 * Finds an existing correspondent by name (case-insensitive) or creates a new one.
 *
 * @param name - The correspondent name to look up or create.
 * @param baseUrl - The Paperless-ngx API base URL (no trailing slash).
 * @param token - The Paperless-ngx API authentication token.
 * @returns The numeric ID of the found or newly created correspondent.
 */
async function findOrCreateCorrespondent(
  name: string,
  baseUrl: string,
  token: string
): Promise<number> {
  const response = await $fetch<{ results: Array<{ id: number; name: string }> }>(
    `${baseUrl}/api/correspondents/`,
    {
      headers: { Authorization: `Token ${token}`, Accept: 'application/json; version=5' },
      query: { name__icontains: name }
    }
  )

  const existing = response.results.find(c => c.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id

  const created = await $fetch<{ id: number }>(`${baseUrl}/api/correspondents/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'application/json; version=5',
      'Content-Type': 'application/json'
    },
    body: { name }
  })
  return created.id
}

/**
 * Finds an existing document type by name (case-insensitive) or creates a new one.
 *
 * @param name - The document type name to look up or create.
 * @param baseUrl - The Paperless-ngx API base URL (no trailing slash).
 * @param token - The Paperless-ngx API authentication token.
 * @returns The numeric ID of the found or newly created document type.
 */
async function findOrCreateDocumentType(
  name: string,
  baseUrl: string,
  token: string
): Promise<number> {
  const response = await $fetch<{ results: Array<{ id: number; name: string }> }>(
    `${baseUrl}/api/document_types/`,
    {
      headers: { Authorization: `Token ${token}`, Accept: 'application/json; version=5' },
      query: { name__icontains: name }
    }
  )

  const existing = response.results.find(t => t.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id

  const created = await $fetch<{ id: number }>(`${baseUrl}/api/document_types/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'application/json; version=5',
      'Content-Type': 'application/json'
    },
    body: { name }
  })
  return created.id
}

/**
 * Calculates the next available archive serial number (ASN).
 *
 * Queries Paperless for the document with the highest ASN and returns that + 1.
 * Falls back to `1` if no documents have an ASN assigned.
 *
 * @param baseUrl - The Paperless-ngx API base URL (no trailing slash).
 * @param token - The Paperless-ngx API authentication token.
 * @returns The next sequential ASN value.
 */
async function getNextASN(baseUrl: string, token: string): Promise<number> {
  // Get documents ordered by ASN descending, limit 1
  const response = await $fetch<{ results: Array<{ archive_serial_number: number | null }> }>(
    `${baseUrl}/api/documents/`,
    {
      headers: { Authorization: `Token ${token}`, Accept: 'application/json; version=5' },
      query: { ordering: '-archive_serial_number', page_size: 1 }
    }
  )

  const maxASN = response.results?.[0]?.archive_serial_number
  return (maxASN ?? 0) + 1
}

/**
 * Resolves an array of tag names to their IDs, creating missing tags as needed.
 *
 * Fetches all existing tags (up to 500) from Paperless, then for each name
 * either returns the matching ID or creates a new tag and returns its ID.
 *
 * @param names - Array of tag names to resolve.
 * @param baseUrl - The Paperless-ngx API base URL (no trailing slash).
 * @param token - The Paperless-ngx API authentication token.
 * @returns An array of numeric tag IDs in the same order as the input names.
 */
async function findOrCreateTags(
  names: string[],
  baseUrl: string,
  token: string
): Promise<number[]> {
  const tagIds: number[] = []

  const response = await $fetch<{ results: Array<{ id: number; name: string }> }>(
    `${baseUrl}/api/tags/?page_size=500`,
    {
      headers: { Authorization: `Token ${token}`, Accept: 'application/json; version=5' }
    }
  )

  for (const name of names) {
    const existing = response.results.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      tagIds.push(existing.id)
    } else {
      const created = await $fetch<{ id: number }>(`${baseUrl}/api/tags/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          Accept: 'application/json; version=5',
          'Content-Type': 'application/json'
        },
        body: { name }
      })
      tagIds.push(created.id)
    }
  }

  return tagIds
}

/**
 * Nitro plugin that processes pending Paperless documents one at a time.
 *
 * Flow per iteration:
 * 1. Find ONE unprocessed document (processed=0), oldest first
 * 2. Mark as in-progress (processed=2)
 * 3. Download file from Paperless
 * 4. Run OCR
 * 5. Format content with AI
 * 6. Extract metadata with AI
 * 7. PATCH Paperless (only empty fields)
 * 8. Mark as done (processed=1)
 */
export default defineNitroPlugin(nitroApp => {
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isProcessing = false
  let started = false

  nitroApp.hooks.hook('request', async () => {
    if (started) return
    started = true

    const config = useRuntimeConfig()
    const intervalMs = Number(config.processIntervalMs) || 10000

    const baseUrl = config.paperlessBaseUrl?.replace(/\/+$/, '')
    const token = config.paperlessApiToken
    if (!baseUrl || !token) {
      consola.warn(
        '[Document Processor] Not configured (NUXT_PAPERLESS_BASE_URL or NUXT_PAPERLESS_API_TOKEN is missing)'
      )
      return
    }

    consola.info(`[Document Processor] Starting processing every ${intervalMs}ms`)

    const processNext = async () => {
      if (isProcessing) return
      isProcessing = true
      let processingDocId: number | undefined

      try {
        // 1. Find ONE pending document
        const [doc] = await db
          .select()
          .from(schema.paperlessDocuments)
          .where(
            or(
              eq(schema.paperlessDocuments.processed, 0),
              eq(schema.paperlessDocuments.processed, 2)
            )
          )
          .orderBy(asc(schema.paperlessDocuments.paperlessCreated))
          .limit(1)

        if (!doc) {
          return
        }

        processingDocId = doc.id
        consola.info(`[Document Processor] Processing document #${doc.id}: ${doc.title}`)

        // 2. Mark as in-progress
        await db
          .update(schema.paperlessDocuments)
          .set({
            processed: 2,
            processingStartedAt: new Date(),
            processingCompletedAt: null,
            updatedAt: new Date()
          })
          .where(eq(schema.paperlessDocuments.id, doc.id))

        // 3-4. Download file + Run OCR via internal API
        consola.info(
          `[Document Processor] Doc #${doc.id} — Downloading and processing OCR with GLM...`
        )
        const ocrResult = await $fetch(`/api/paperless/documents/${doc.id}/ocr`, {
          method: 'POST',
          baseURL: '/'
        })
        consola.info(
          `[Document Processor] Doc #${doc.id} — OCR completed: ${ocrResult.ocr.totalPages} pages extracted (${ocrResult.ocr.pages.reduce((acc: number, p: { text: string }) => acc + p.text.length, 0)} characters)`
        )

        const ocrText = ocrResult.ocr.pages.map((p: { text: string }) => p.text).join('\n\n')
        const ocrMethod = ocrResult.method

        // Clean the OCR text
        const cleanedOcrText = cleanText(ocrText)

        // 5. Update OCR content in SQLite
        await db
          .update(schema.paperlessDocuments)
          .set({ ocrContent: cleanedOcrText, ocrMethod: ocrMethod, updatedAt: new Date() })
          .where(eq(schema.paperlessDocuments.id, doc.id))

        // 6. Format content with AI
        consola.info(
          `[Document Processor] Doc #${doc.id} — Formatting content with MiniMax M2.7...`
        )
        const aiContent = await formatWithAI(cleanedOcrText, doc.title, config)
        consola.info(
          `[Document Processor] Doc #${doc.id} — Content formatted (${aiContent.length} characters)`
        )

        // Clean the AI-formatted content
        const cleanedAiContent = cleanText(aiContent)

        // 7. Update AI content in SQLite
        await db
          .update(schema.paperlessDocuments)
          .set({ aiContent: cleanedAiContent, updatedAt: new Date() })
          .where(eq(schema.paperlessDocuments.id, doc.id))

        // 8. Extract metadata with AI
        consola.info(
          `[Document Processor] Doc #${doc.id} — Extracting metadata with MiniMax M2.7...`
        )
        const metadata = await extractMetadata(cleanedAiContent, doc.title, config)
        consola.info(
          `[Document Processor] Doc #${doc.id} — Metadata extracted: ${JSON.stringify(metadata)}`
        )

        // 9. Get current document from Paperless to check empty fields
        consola.info(`[Document Processor] Doc #${doc.id} — Querying Paperless for empty fields...`)
        const paperlessDoc = await $fetch<PaperlessDocument>(
          `${baseUrl}/api/documents/${doc.id}/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              Accept: 'application/json; version=5'
            }
          }
        )

        // 10. Build PATCH payload — ONLY fill empty/null fields, NEVER overwrite
        const patchBody: Record<string, string | number | number[] | null> = {}

        // Title: update if empty or same as filename
        if (
          (!paperlessDoc.title || paperlessDoc.title === doc.originalFileName) &&
          metadata.suggestedTitle
        ) {
          patchBody.title = metadata.suggestedTitle
          consola.info(`[Document Processor] Doc #${doc.id} — Title: "${metadata.suggestedTitle}"`)
        }

        // Correspondent: resolve name to ID, only if document has no correspondent
        if (!paperlessDoc.correspondent && metadata.suggestedCorrespondent) {
          try {
            const correspondentId = await findOrCreateCorrespondent(
              metadata.suggestedCorrespondent,
              baseUrl,
              token
            )
            patchBody.correspondent = correspondentId
            consola.info(
              `[Document Processor] Doc #${doc.id} — Correspondent: "${metadata.suggestedCorrespondent}" (ID: ${correspondentId})`
            )
          } catch (e) {
            consola.warn(
              `[Document Processor] Doc #${doc.id} — Error resolving correspondent:`,
              e instanceof Error ? e.message : e
            )
          }
        }

        // Document Type: resolve name to ID, only if document has no type
        if (!paperlessDoc.document_type && metadata.suggestedDocumentType) {
          try {
            const docTypeId = await findOrCreateDocumentType(
              metadata.suggestedDocumentType,
              baseUrl,
              token
            )
            patchBody.document_type = docTypeId
            consola.info(
              `[Document Processor] Doc #${doc.id} — Document Type: "${metadata.suggestedDocumentType}" (ID: ${docTypeId})`
            )
          } catch (e) {
            consola.warn(
              `[Document Processor] Doc #${doc.id} — Error resolving document type:`,
              e instanceof Error ? e.message : e
            )
          }
        }

        // Tags: resolve names to IDs, merge with existing tags (don't overwrite)
        if (metadata.suggestedTags?.length) {
          try {
            const newTagIds = await findOrCreateTags(metadata.suggestedTags, baseUrl, token)
            const existingTagIds = paperlessDoc.tags || []
            const mergedTags = [...new Set([...existingTagIds, ...newTagIds])]
            if (mergedTags.length > existingTagIds.length) {
              patchBody.tags = mergedTags
              consola.info(
                `[Document Processor] Doc #${doc.id} — Tags: ${metadata.suggestedTags.join(', ')} (IDs: ${newTagIds.join(', ')})`
              )
            }
          } catch (e) {
            consola.warn(
              `[Document Processor] Doc #${doc.id} — Error resolving tags:`,
              e instanceof Error ? e.message : e
            )
          }
        }

        // Archive Serial Number: auto-assign if empty, verify not already used
        if (!paperlessDoc.archive_serial_number) {
          try {
            const candidateASN = await getNextASN(baseUrl, token)
            // Verify the candidate ASN is not already used
            const checkExisting = await $fetch<{ count: number }>(`${baseUrl}/api/documents/`, {
              headers: { Authorization: `Token ${token}`, Accept: 'application/json; version=5' },
              query: { archive_serial_number: candidateASN, page_size: 1 }
            })
            if (checkExisting.count > 0) {
              consola.warn(
                `[Document Processor] Doc #${doc.id} — ASN ${candidateASN} already exists, skipping ASN assignment`
              )
            } else {
              patchBody.archive_serial_number = candidateASN
              consola.info(`[Document Processor] Doc #${doc.id} — ASN: ${candidateASN}`)
            }
          } catch (e) {
            consola.warn(
              `[Document Processor] Doc #${doc.id} — Error generating ASN:`,
              e instanceof Error ? e.message : e
            )
          }
        }

        // Preserve existing storage_path in PATCH
        if (paperlessDoc.storage_path) {
          patchBody.storage_path = paperlessDoc.storage_path
        }

        // 11. PATCH Paperless if there are changes
        if (Object.keys(patchBody).length > 0) {
          try {
            consola.info(
              `[Document Processor] Doc #${doc.id} — PATCH payload:`,
              JSON.stringify(patchBody)
            )
            await $fetch(`${baseUrl}/api/documents/${doc.id}/`, {
              method: 'PATCH',
              headers: {
                Authorization: `Token ${token}`,
                Accept: 'application/json; version=5',
                'Content-Type': 'application/json'
              },
              body: patchBody
            })
            consola.success(`[Document Processor] Doc #${doc.id} — PATCH applied successfully`)

            // Add a note documenting the AI processing
            try {
              const noteText = `Document automatically processed by AI (MiniMax M2.7).\nUpdated fields: ${Object.keys(patchBody).join(', ')}`
              await $fetch(`${baseUrl}/api/documents/${doc.id}/notes/`, {
                method: 'POST',
                headers: {
                  Authorization: `Token ${token}`,
                  Accept: 'application/json; version=5',
                  'Content-Type': 'application/json'
                },
                body: { note: noteText }
              })
              consola.info(`[Document Processor] Doc #${doc.id} — Note added`)
            } catch (e) {
              consola.warn(
                `[Document Processor] Doc #${doc.id} — Error adding note:`,
                e instanceof Error ? e.message : e
              )
            }
          } catch (patchError: unknown) {
            const patchErrorRecord = patchError as { data?: unknown; cause?: unknown }
            const errData =
              patchErrorRecord.data ||
              patchErrorRecord.cause ||
              (patchError instanceof Error ? patchError.message : patchError)
            consola.error(`[Document Processor] Doc #${doc.id} — PATCH failed:`, errData)
            consola.error(
              `[Document Processor] Doc #${doc.id} — PATCH payload was:`,
              JSON.stringify(patchBody)
            )
            // Don't re-throw — mark as processed anyway since OCR content was saved
          }
        }

        // 12. Mark as done
        await db
          .update(schema.paperlessDocuments)
          .set({ processed: 1, processingCompletedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.paperlessDocuments.id, doc.id))

        consola.success(`[Document Processor] Doc #${doc.id} processed successfully`)
      } catch (error) {
        consola.error('[Document Processor] Error:', error instanceof Error ? error.message : error)

        // Reset to pending for retry
        if (processingDocId !== undefined) {
          try {
            await db
              .update(schema.paperlessDocuments)
              .set({ processed: 0, updatedAt: new Date() })
              .where(eq(schema.paperlessDocuments.id, processingDocId))
          } catch {
            /* ignore recovery errors */
          }
        }
      } finally {
        isProcessing = false
      }
    }

    processNext()
    intervalId = setInterval(processNext, intervalMs)
  })

  nitroApp.hooks.hook('close', () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
      consola.info('[Document Processor] Stopped')
    }
  })
})

/**
 * Formats raw OCR text into clean, well-structured content using MiniMax M2.7.
 *
 * This is the plugin-local version that reads the API key directly from config
 * instead of requiring an H3Event (which is unavailable inside the plugin interval).
 *
 * @param rawText - The raw OCR-extracted text to format.
 * @param documentTitle - The document title, injected into the system prompt for context.
 * @param config - Runtime configuration with MiniMax credentials.
 * @returns The cleaned and formatted text string.
 */
async function formatWithAI(
  rawText: string,
  documentTitle: string,
  config: DocumentProcessorConfig
): Promise<string> {
  if (!config.minimaxApiKey?.trim()) {
    throw new Error('MINIMAX_API_KEY is not configured')
  }
  if (!config.minimaxBaseUrl?.trim()) {
    throw new Error('MINIMAX_BASE_URL is not configured')
  }

  const minimax = createMinimax({
    apiKey: config.minimaxApiKey.trim(),
    baseURL: config.minimaxBaseUrl.trim()
  })

  const { text } = await generateText({
    model: minimax('MiniMax-M2.7'),
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
 * Extracts metadata (title, tags, correspondent, document type) from formatted
 * document content using MiniMax M2.7.
 *
 * This is the plugin-local version that reads the API key directly from config
 * instead of requiring an H3Event (which is unavailable inside the plugin interval).
 *
 * @param formattedContent - The already-formatted document text.
 * @param existingTitle - The current document title for reference.
 * @param config - Runtime configuration with MiniMax credentials.
 * @returns Extracted metadata suggestions (all fields optional).
 */
async function extractMetadata(
  formattedContent: string,
  existingTitle: string,
  config: DocumentProcessorConfig
): Promise<{
  suggestedTitle?: string
  suggestedTags?: string[]
  suggestedCorrespondent?: string
  suggestedDocumentType?: string
}> {
  if (!config.minimaxApiKey?.trim()) {
    throw new Error('MINIMAX_API_KEY is not configured')
  }
  if (!config.minimaxBaseUrl?.trim()) {
    throw new Error('MINIMAX_BASE_URL is not configured')
  }

  const minimax = createMinimax({
    apiKey: config.minimaxApiKey.trim(),
    baseURL: config.minimaxBaseUrl.trim()
  })

  const { text } = await generateText({
    model: minimax('MiniMax-M2.7'),
    system: `You are a document metadata extractor. Analyze the provided document content and return a JSON object with the following fields:

- "suggestedTitle": un título claro y descriptivo en español que resuma el contenido del documento (ej: "Factura #1234 - Empresa XYZ - Enero 2025")
- "suggestedCorrespondent": la organización o persona que creó, envió o es responsable del documento. Debe ser el nombre de la entidad emisora (ej: "CFE", "Telmex", "SAT", "Juan Pérez")
- "suggestedDocumentType": clasifica el documento en uno de estos tipos comunes: Factura, Recibo, Contrato, Comprobante, Carta, Reporte, Certificado, Estado de Cuenta, Póliza, Constancia, Acuse, Nota de Crédito, Cotización, Orden de Compra. Si no encaja en ninguno, usa un tipo descriptivo breve
- "suggestedTags": un array de 3 a 5 palabras clave relevantes en español que categoricen el documento (ej: ["fiscal", "2025", "servicios", "mensual"])

If a field cannot be determined from the content, omit it from the JSON.
Return ONLY the JSON object, no additional text or markdown formatting.`,
    prompt: `Document title: "${existingTitle}"

Document content:
${formattedContent}`
  })

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
