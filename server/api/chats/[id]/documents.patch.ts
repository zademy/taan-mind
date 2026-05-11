import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  MAX_CHAT_DOCUMENTS,
  assertChatDocumentsAvailable,
  getChatDocumentSummaries,
  normalizeChatDocumentIds,
  replaceChatDocuments
} from '../../../utils/chatDocuments'

/**
 * PATCH /api/chats/:id/documents
 *
 * Replaces the document context for an owner-owned chat. Used by project
 * starter chats so users can search/select Paperless documents before asking.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse)
  const { documentIds } = await readValidatedBody(
    event,
    z.object({
      documentIds: z.array(z.number().int().positive()).max(MAX_CHAT_DOCUMENTS).default([])
    }).parse
  )

  const chat = await db.query.chats.findFirst({
    where: () => and(eq(schema.chats.id, id as string), eq(schema.chats.userId, userId))
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const normalizedDocumentIds = normalizeChatDocumentIds({ documentIds })
  await assertChatDocumentsAvailable(normalizedDocumentIds)
  await replaceChatDocuments(chat.id, normalizedDocumentIds)

  return await getChatDocumentSummaries({
    id: chat.id,
    documentId: normalizedDocumentIds[0] ?? null
  })
})
