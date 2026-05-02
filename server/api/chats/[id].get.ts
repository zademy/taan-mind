import { db, schema } from 'hub:db'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * GET /api/chats/:id
 *
 * Retrieves a single chat with all its messages.
 *
 * - Private chats are only accessible by the owner.
 * - Public chats are accessible by any authenticated user.
 * - The `userId` field is excluded from the response for privacy.
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

  // Exclude userId from the response for privacy
  const { userId: _, ...rest } = chat
  return { ...rest, isOwner }
})
