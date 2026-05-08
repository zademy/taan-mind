import type { UIMessage } from 'ai'
import { db, schema } from 'hub:db'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import {
  MAX_CHAT_DOCUMENTS,
  assertChatDocumentsAvailable,
  insertChatDocuments,
  normalizeChatDocumentIds
} from '../utils/chatDocuments'

/**
 * POST /api/chats
 *
 * Creates a new chat with the first user message, or returns the existing chat
 * if a chat with the same ID already exists for this user.
 *
 * This endpoint is idempotent — it safely handles duplicate creation attempts
 * from the client (e.g., page reload or retry).
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id, message, personality, documentId, documentIds } = await readValidatedBody(
    event,
    z.object({
      /** Client-generated chat ID for idempotent creation. */
      id: z.string(),
      /** First user message to start the conversation. */
      message: z.custom<UIMessage>(),
      /** Personality identifier (default or `custom:<uuid>`). */
      personality: z.string().default('friendly'),
      /** Legacy optional Paperless document ID to attach as context. */
      documentId: z.number().int().positive().nullable().optional(),
      /** Optional Paperless document IDs to attach as chat-level context. */
      documentIds: z
        .array(z.number().int().positive())
        .max(MAX_CHAT_DOCUMENTS)
        .nullable()
        .optional()
    }).parse
  )

  const messageId = message.id || crypto.randomUUID()
  const validatedPersonality = await assertPersonalityAvailable(personality, userId)
  const normalizedDocumentIds = normalizeChatDocumentIds({ documentId, documentIds })
  await assertChatDocumentsAvailable(normalizedDocumentIds)

  // Attempt to insert a new chat; ignore if it already exists
  const [insertedChat] = await db
    .insert(schema.chats)
    .values({
      id,
      title: '',
      userId,
      personality: validatedPersonality,
      documentId: normalizedDocumentIds[0] ?? null
    })
    .onConflictDoNothing()
    .returning()

  // If the chat was not inserted (already exists), fetch it instead
  const chat =
    insertedChat ||
    (await db.query.chats.findFirst({
      where: () => and(eq(schema.chats.id, id), eq(schema.chats.userId, userId))
    }))

  if (!chat) {
    throw createError({ statusCode: 403, statusMessage: 'Chat not found or access denied' })
  }

  await insertChatDocuments(chat.id, normalizedDocumentIds)

  // Insert the first user message (ignore if already present)
  await db
    .insert(schema.messages)
    .values({
      id: messageId,
      chatId: chat.id,
      role: 'user',
      parts: message.parts
    })
    .onConflictDoNothing()

  return chat
})
