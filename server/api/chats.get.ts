import { db, schema } from 'hub:db'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'

/**
 * GET /api/chats
 *
 * Returns standalone chats belonging to the authenticated user,
 * ordered by creation date (newest first). Project chats are listed through
 * `/api/projects` so the sidebar can keep Chats and Taanwork separate.
 *
 * @module server/api/chats.get.ts
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
    .where(and(eq(chats.userId, userId), isNull(chats.projectId)))
    .groupBy(chats.id)
    .orderBy(desc(chats.createdAt))
})
