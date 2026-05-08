import { db, schema } from 'hub:db'
import { desc, eq, sql } from 'drizzle-orm'

/**
 * GET /api/chats
 *
 * Returns all chats belonging to the authenticated user,
 * ordered by creation date (newest first).
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { chats, chatDocuments } = schema

  return await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      documentCount: sql<number>`CASE
        WHEN COUNT(${chatDocuments.documentId}) > 0 THEN COUNT(${chatDocuments.documentId})
        WHEN ${chats.documentId} IS NOT NULL THEN 1
        ELSE 0
      END`
    })
    .from(chats)
    .leftJoin(chatDocuments, eq(chatDocuments.chatId, chats.id))
    .where(eq(chats.userId, userId))
    .groupBy(chats.id)
    .orderBy(desc(chats.createdAt))
})
