import { db, schema } from 'hub:db'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/chats
 *
 * Returns all chats belonging to the authenticated user,
 * ordered by creation date (newest first).
 */
export default defineEventHandler(async (event) => {
  const userId = getChatUserId(event)
  const { chats } = schema

  return await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.createdAt))
})
