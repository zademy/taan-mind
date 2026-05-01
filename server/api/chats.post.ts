import type { UIMessage } from 'ai'
import { db, schema } from 'hub:db'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

/**
 * POST /api/chats
 *
 * Creates a new chat with the first user message, or returns the existing chat
 * if a chat with the same ID already exists for this user.
 *
 * This endpoint is idempotent — it safely handles duplicate creation attempts
 * from the client (e.g., page reload or retry).
 */
export default defineEventHandler(async (event) => {
  const userId = getChatUserId(event)
  const { id, message, personality, documentId } = await readValidatedBody(event, z.object({
    id: z.string(),
    message: z.custom<UIMessage>(),
    personality: z.string().default('friendly'),
    documentId: z.number().nullable().optional()
  }).parse)

  const messageId = message.id || crypto.randomUUID()

  // Attempt to insert a new chat; ignore if it already exists
  const [insertedChat] = await db.insert(schema.chats).values({
    id,
    title: '',
    userId,
    personality,
    documentId: documentId ?? null
  }).onConflictDoNothing().returning()

  // If the chat was not inserted (already exists), fetch it instead
  const chat = insertedChat || await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id),
      eq(schema.chats.userId, userId)
    )
  })

  if (!chat) {
    throw createError({ statusCode: 403, statusMessage: 'Chat not found or access denied' })
  }

  // Insert the first user message (ignore if already present)
  await db.insert(schema.messages).values({
    id: messageId,
    chatId: chat.id,
    role: 'user',
    parts: message.parts
  }).onConflictDoNothing()

  return chat
})
