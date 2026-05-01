import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * DELETE /api/chats/:id
 *
 * Deletes a chat and all its associated messages (cascade).
 * Only the owner of the chat can delete it.
 */
export default defineEventHandler(async (event) => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  // Verify the chat exists and belongs to the requesting user
  const chat = await db.query.chats.findFirst({
    where: () => and(eq(schema.chats.id, id as string), eq(schema.chats.userId, userId))
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  return await db.delete(schema.chats)
    .where(and(eq(schema.chats.id, id as string), eq(schema.chats.userId, userId)))
    .returning()
})
