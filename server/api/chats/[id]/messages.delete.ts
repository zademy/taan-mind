import { db, schema } from 'hub:db'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

/**
 * DELETE /api/chats/:id/messages
 *
 * Deletes messages from a chat starting at a target message.
 *
 * - **edit**: Removes all messages after the target user message (exclusive),
 *   so the user can re-submit an edited version.
 * - **regenerate**: Removes the target assistant message and everything after it,
 *   so the AI can generate a new response.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)

  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string()
    }).parse
  )

  const { messageId, type } = await readValidatedBody(
    event,
    z.object({
      messageId: z.string(),
      type: z.enum(['edit', 'regenerate'])
    }).parse
  )

  // Verify the chat belongs to the requesting user
  const chat = await db.query.chats.findFirst({
    where: () => and(eq(schema.chats.id, id as string), eq(schema.chats.userId, userId))
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  // Load all messages ordered chronologically to determine deletion range
  const allMessages = await db
    .select({ id: schema.messages.id, role: schema.messages.role })
    .from(schema.messages)
    .where(eq(schema.messages.chatId, id as string))
    .orderBy(asc(schema.messages.createdAt), asc(schema.messages.id))

  const targetIndex = allMessages.findIndex(m => m.id === messageId)
  if (targetIndex === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  // Validate that the message role matches the requested operation type
  const targetRole = allMessages[targetIndex]!.role
  if (type === 'edit' && targetRole !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'Can only edit user messages' })
  }
  if (type === 'regenerate' && targetRole !== 'assistant') {
    throw createError({ statusCode: 400, statusMessage: 'Can only regenerate assistant messages' })
  }

  // Determine the starting index for deletion based on operation type
  const startIndex = type === 'edit' ? targetIndex + 1 : targetIndex
  const idsToDelete = allMessages.slice(startIndex).map(m => m.id)

  if (idsToDelete.length > 0) {
    await db.delete(schema.messages).where(inArray(schema.messages.id, idsToDelete))
  }

  return { success: true }
})
