import { db, schema } from 'hub:db'
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getChatDocumentSummaries } from '../../utils/chatDocuments'

/**
 * GET /api/chats/:id
 *
 * Retrieves a single chat with all its messages.
 *
 * - Private chats are only accessible by the owner.
 * - Public chats are accessible by any authenticated user.
 * - The `userId` field is excluded from the response for privacy.
 *
 * @module server/api/chats
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)

  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string()
    }).parse
  )

  const chat = await db.query.chats.findFirst({
    where: () => eq(schema.chats.id, id as string),
    with: {
      project: true,
      messages: {
        orderBy: () => asc(schema.messages.createdAt)
      }
    }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const isOwner = chat.userId === userId

  // Restrict private chats to the owner only
  if (chat.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const documents = await getChatDocumentSummaries(chat)
  const recentProjectChats =
    isOwner && chat.projectId ? await getRecentProjectChats(chat.projectId, chat.id, userId) : []

  // Exclude userId from the response for privacy
  const { project: chatProject, userId: _, ...rest } = chat
  return {
    ...rest,
    project:
      isOwner && chatProject
        ? {
            id: chatProject.id,
            name: chatProject.name
          }
        : null,
    recentProjectChats,
    documentId: chat.documentId ?? documents[0]?.id ?? null,
    documentIds: documents.map(document => document.id),
    documents,
    isOwner
  }
})

async function getRecentProjectChats(projectId: string, activeChatId: string, userId: string) {
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
    .where(
      and(eq(chats.userId, userId), eq(chats.projectId, projectId), ne(chats.id, activeChatId))
    )
    .groupBy(chats.id)
    .orderBy(desc(chats.createdAt))
    .limit(3)
}
