import { db, schema } from 'hub:db'
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'

type ProjectChatPreview = {
  id: string
  title: string | null
  createdAt: Date
  documentCount: number
}

/**
 * GET /api/projects
 *
 * Lists user-owned projects for the Taanwork sidebar, including a lightweight
 * preview of the three most recent chats in each project.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { projects, chats, chatDocuments } = schema

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      chatCount: sql<number>`COUNT(${chats.id})`,
      latestChatCreatedAt: sql<Date | null>`MAX(${chats.createdAt})`
    })
    .from(projects)
    .leftJoin(chats, and(eq(chats.projectId, projects.id), eq(chats.userId, userId)))
    .where(eq(projects.userId, userId))
    .groupBy(projects.id)
    .orderBy(desc(sql`COALESCE(MAX(${chats.createdAt}), ${projects.createdAt})`))

  if (projectRows.length === 0) return []

  const chatRows = await db
    .select({
      id: chats.id,
      title: chats.title,
      projectId: chats.projectId,
      createdAt: chats.createdAt,
      documentCount: sql<number>`CASE
        WHEN COUNT(${chatDocuments.documentId}) > 0 THEN COUNT(${chatDocuments.documentId})
        WHEN ${chats.documentId} IS NOT NULL THEN 1
        ELSE 0
      END`
    })
    .from(chats)
    .leftJoin(chatDocuments, eq(chatDocuments.chatId, chats.id))
    .where(and(eq(chats.userId, userId), isNotNull(chats.projectId)))
    .groupBy(chats.id)
    .orderBy(desc(chats.createdAt))

  const recentChatsByProject = new Map<string, ProjectChatPreview[]>()

  for (const chat of chatRows) {
    if (!chat.projectId) continue
    const projectChats = recentChatsByProject.get(chat.projectId) ?? []
    if (projectChats.length >= 3) continue

    projectChats.push({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      documentCount: chat.documentCount
    })
    recentChatsByProject.set(chat.projectId, projectChats)
  }

  return projectRows.map(project => ({
    ...project,
    recentChats: recentChatsByProject.get(project.id) ?? []
  }))
})
