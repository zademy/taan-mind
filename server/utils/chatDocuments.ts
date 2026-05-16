/**
 * @file Chat document attachment utilities.
 *
 * Manages the relationship between chats and Paperless-ngx documents used as
 * AI context. Supports up to {@link MAX_CHAT_DOCUMENTS} documents per chat,
 * persisted in the `chat_documents` join table with ordered positions.
 * Also provides helpers to build system-prompt context sections from attached
 * documents so the AI can reference their content during generation.
 */

import { db, schema } from 'hub:db'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

/** Maximum number of Paperless documents that can be attached to a single chat. */
export const MAX_CHAT_DOCUMENTS = 5

/** Input payload supporting both legacy single-document and multi-document attachment. */
type ChatDocumentInput = {
  /** Legacy single Paperless document ID. */
  documentId?: number | null
  /** Ordered array of Paperless document IDs (preferred). */
  documentIds?: number[] | null
}

/** A chat row that may carry a legacy `documentId` column value. */
type ChatWithLegacyDocument = {
  /** Chat UUID. */
  id: string
  /** Legacy single-document column (kept in sync for backward compatibility). */
  documentId?: number | null
}

/** Lightweight document summary returned in API responses. */
export type ChatDocumentSummary = {
  /** Paperless-ngx document ID. */
  id: number
  /** Document title for display. */
  title: string
}

/**
 * Full document context used when building the AI system prompt.
 * Combines summary fields with content and ordering information.
 */
type ChatDocumentContext = ChatDocumentSummary & {
  /** Correspondent ID, or `null` if unassigned. */
  correspondent: number | null
  /** Document type ID, or `null` if unassigned. */
  documentType: number | null
  /** AI-generated enrichment content, or `null` if not processed. */
  aiContent: string | null
  /** Raw OCR-extracted content, or `null` if not processed. */
  ocrContent: string | null
  /** Position index preserving selection order (0-based). */
  position: number
}

/**
 * Normalizes the new multi-document payload and legacy single-document payload
 * into a de-duplicated, ordered list of Paperless document IDs.
 */
export function normalizeChatDocumentIds(input: ChatDocumentInput): number[] {
  const rawIds = Array.isArray(input.documentIds)
    ? input.documentIds
    : input.documentId
      ? [input.documentId]
      : []

  const ids = rawIds.filter((id): id is number => Number.isInteger(id) && id > 0)
  const uniqueIds = Array.from(new Set(ids))

  if (uniqueIds.length > MAX_CHAT_DOCUMENTS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Select up to ${MAX_CHAT_DOCUMENTS} documents`
    })
  }

  return uniqueIds
}

/**
 * Ensures every selected document exists, is processed, and has not been
 * deleted from the local Paperless cache.
 */
export async function assertChatDocumentsAvailable(documentIds: number[]) {
  if (documentIds.length === 0) return

  const t = schema.paperlessDocuments
  const rows = await db
    .select({ id: t.id })
    .from(t)
    .where(and(inArray(t.id, documentIds), eq(t.processed, 1), isNull(t.deletedAt)))

  if (rows.length !== documentIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'One or more selected documents are unavailable or not processed yet'
    })
  }
}

/** Persists ordered document attachments for a chat. */
export async function insertChatDocuments(chatId: string, documentIds: number[]) {
  if (documentIds.length === 0) return

  await db
    .insert(schema.chatDocuments)
    .values(
      documentIds.map((documentId, position) => ({
        chatId,
        documentId,
        position
      }))
    )
    .onConflictDoNothing()
}

/**
 * Replaces all document attachments for a chat with the provided ordered list.
 * Keeps the legacy `chats.document_id` column in sync for older code paths.
 */
export async function replaceChatDocuments(chatId: string, documentIds: number[]) {
  await db.delete(schema.chatDocuments).where(eq(schema.chatDocuments.chatId, chatId))

  await db
    .update(schema.chats)
    .set({ documentId: documentIds[0] ?? null })
    .where(eq(schema.chats.id, chatId))

  await insertChatDocuments(chatId, documentIds)
}

/** Returns lightweight document metadata attached to a chat. */
export async function getChatDocumentSummaries(chat: ChatWithLegacyDocument) {
  const documents = await getChatDocuments(chat)
  return documents.map(({ id, title }) => ({ id, title }))
}

/** Builds a system-prompt section with all documents attached to a chat. */
export async function buildChatDocumentContext(chat: ChatWithLegacyDocument) {
  const documents = await getChatDocuments(chat)
  if (documents.length === 0) return ''

  const heading =
    documents.length === 1
      ? '**DOCUMENT CONTEXT (reference material for this conversation):**'
      : `**DOCUMENT CONTEXTS (${documents.length} reference documents for this conversation):**`

  return `${heading}
${documents.map(formatDocumentContext).join('\n---\n')}
---

`
}

/** Builds a system-prompt document context section from an explicit ordered ID list. */
export async function buildDocumentContextFromIds(documentIds: number[]) {
  if (documentIds.length === 0) return ''

  const documents = await getDocumentsByIds(documentIds)
  if (documents.length === 0) return ''

  const heading =
    documents.length === 1
      ? '**DOCUMENT CONTEXT (reference material for this inline AI action):**'
      : `**DOCUMENT CONTEXTS (${documents.length} reference documents for this inline AI action):**`

  return `${heading}
${documents.map(formatDocumentContext).join('\n---\n')}
---

`
}

async function getChatDocuments(chat: ChatWithLegacyDocument): Promise<ChatDocumentContext[]> {
  const cd = schema.chatDocuments
  const doc = schema.paperlessDocuments

  const rows = await db
    .select({
      id: doc.id,
      title: doc.title,
      correspondent: doc.correspondent,
      documentType: doc.documentType,
      aiContent: doc.aiContent,
      ocrContent: doc.ocrContent,
      position: cd.position
    })
    .from(cd)
    .innerJoin(doc, eq(cd.documentId, doc.id))
    .where(and(eq(cd.chatId, chat.id), isNull(doc.deletedAt)))
    .orderBy(asc(cd.position), asc(doc.id))

  if (rows.length > 0 || !chat.documentId) {
    return rows
  }

  const legacyDocument = await db.query.paperlessDocuments.findFirst({
    where: () => and(eq(schema.paperlessDocuments.id, chat.documentId!), isNull(doc.deletedAt))
  })

  if (!legacyDocument) return []

  return [
    {
      id: legacyDocument.id,
      title: legacyDocument.title,
      correspondent: legacyDocument.correspondent,
      documentType: legacyDocument.documentType,
      aiContent: legacyDocument.aiContent,
      ocrContent: legacyDocument.ocrContent,
      position: 0
    }
  ]
}

async function getDocumentsByIds(documentIds: number[]): Promise<ChatDocumentContext[]> {
  const doc = schema.paperlessDocuments

  const rows = await db
    .select({
      id: doc.id,
      title: doc.title,
      correspondent: doc.correspondent,
      documentType: doc.documentType,
      aiContent: doc.aiContent,
      ocrContent: doc.ocrContent
    })
    .from(doc)
    .where(and(inArray(doc.id, documentIds), isNull(doc.deletedAt)))

  const rowsById = new Map(rows.map(row => [row.id, row]))

  return documentIds
    .map((id, position) => {
      const row = rowsById.get(id)
      return row ? { ...row, position } : null
    })
    .filter((row): row is ChatDocumentContext => row !== null)
}

function formatDocumentContext(document: ChatDocumentContext, index: number) {
  return `Document ${index + 1}
ID: ${document.id}
Title: ${document.title}
${document.correspondent ? `Correspondent: ${document.correspondent}` : ''}
${document.documentType ? `Document Type: ${document.documentType}` : ''}
Content:
${document.aiContent || document.ocrContent || 'No content available'}`
}
