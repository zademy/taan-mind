import { db, schema } from 'hub:db'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

export const MAX_CHAT_DOCUMENTS = 5

type ChatDocumentInput = {
  documentId?: number | null
  documentIds?: number[] | null
}

type ChatWithLegacyDocument = {
  id: string
  documentId?: number | null
}

export type ChatDocumentSummary = {
  id: number
  title: string
}

type ChatDocumentContext = ChatDocumentSummary & {
  correspondent: number | null
  documentType: number | null
  aiContent: string | null
  ocrContent: string | null
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

function formatDocumentContext(document: ChatDocumentContext, index: number) {
  return `Document ${index + 1}
ID: ${document.id}
Title: ${document.title}
${document.correspondent ? `Correspondent: ${document.correspondent}` : ''}
${document.documentType ? `Document Type: ${document.documentType}` : ''}
Content:
${document.aiContent || document.ocrContent || 'No content available'}`
}
