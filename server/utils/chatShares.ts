/**
 * @file Chat share utilities.
 *
 * Provides the full lifecycle for public, read-only chat share links:
 * creation, retrieval, token rotation, revocation, and public access.
 * All mutations are scoped to the chat owner's session.
 */
import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import type { UIMessage } from 'ai'
import { db, schema } from 'hub:db'
import { and, asc, eq } from 'drizzle-orm'
import { generateChatShareToken } from './shareTokens'

/** Drizzle row type for the `chat_shares` table. */
type ChatShareRecord = typeof schema.chatShares.$inferSelect

/** Drizzle row type for the `chats` table. */
type ChatRecord = typeof schema.chats.$inferSelect

/** Drizzle row type for the `messages` table. */
type MessageRecord = typeof schema.messages.$inferSelect

/**
 * Owner-facing share-link representation returned by all share API routes.
 * Contains the public URL and current status of the share.
 */
export type ChatShareResponse = {
  /** Opaque URL-safe token identifying the share link. */
  token: string
  /** Relative path to the shared chat page (e.g. `/share/chat/<token>`). */
  path: string
  /** Absolute public URL built from the current request origin. */
  url: string
  /** Whether the share link is currently active and accessible. */
  isActive: boolean
  /** Share mode — currently only `'live'` is supported. */
  mode: 'live'
  /** When the share link was first created. */
  createdAt: Date
  /** Optional expiry timestamp; `null` means the link never expires. */
  expiresAt: Date | null
  /** When the share was revoked; `null` if still active. */
  revokedAt: Date | null
}

/**
 * Public-facing representation of a shared chat returned by the
 * `GET /api/shared-chats/:token` endpoint. Contains only the data
 * that an anonymous visitor should see — no internal IDs or owner info.
 */
export type PublicSharedChatResponse = {
  /** Chat title displayed on the shared page. */
  title: string
  /** Non-system messages ordered chronologically, with filtered parts. */
  messages: Array<Pick<UIMessage, 'id' | 'role' | 'parts'> & { createdAt: Date }>
  /** When the share link was originally created. */
  sharedAt: Date
  /** Timestamp of the most recent message, or chat creation as fallback. */
  updatedAt: Date
  /** Indicates the share reflects the live chat state. */
  isLive: true
}

/** Loads a chat only when it belongs to the current session owner. */
export async function getOwnedChatOrThrow(chatId: string, userId: string) {
  const chat = await db.query.chats.findFirst({
    where: () => and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId))
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  return chat
}

/** Returns the current share status for an owner-owned chat. */
export async function getOwnedChatShare(event: H3Event, chat: ChatRecord) {
  const share = await db.query.chatShares.findFirst({
    where: () => eq(schema.chatShares.chatId, chat.id)
  })

  return share ? toChatShareResponse(event, share) : null
}

/** Creates or reactivates a single live read-only share link for a chat. */
export async function ensureOwnedChatShare(event: H3Event, chat: ChatRecord) {
  const existing = await db.query.chatShares.findFirst({
    where: () => eq(schema.chatShares.chatId, chat.id)
  })

  if (existing?.active) {
    return toChatShareResponse(event, existing)
  }

  const token = await generateUniqueChatShareToken()

  if (existing) {
    const [updated] = await db
      .update(schema.chatShares)
      .set({
        token,
        active: true,
        mode: 'live',
        expiresAt: null,
        revokedAt: null
      })
      .where(eq(schema.chatShares.id, existing.id))
      .returning()

    return toChatShareResponse(event, updated!)
  }

  const [created] = await db
    .insert(schema.chatShares)
    .values({
      token,
      chatId: chat.id,
      ownerUserId: chat.userId,
      mode: 'live',
      active: true
    })
    .returning()

  return toChatShareResponse(event, created!)
}

/** Rotates the share token, invalidating the previous public URL. */
export async function rotateOwnedChatShare(event: H3Event, chat: ChatRecord) {
  const token = await generateUniqueChatShareToken()
  const existing = await db.query.chatShares.findFirst({
    where: () => eq(schema.chatShares.chatId, chat.id)
  })

  if (!existing) {
    return await ensureOwnedChatShare(event, chat)
  }

  const [updated] = await db
    .update(schema.chatShares)
    .set({
      token,
      active: true,
      mode: 'live',
      expiresAt: null,
      revokedAt: null
    })
    .where(eq(schema.chatShares.id, existing.id))
    .returning()

  return toChatShareResponse(event, updated!)
}

/** Revokes an existing public share URL without deleting the owner chat. */
export async function revokeOwnedChatShare(event: H3Event, chat: ChatRecord) {
  const existing = await db.query.chatShares.findFirst({
    where: () => eq(schema.chatShares.chatId, chat.id)
  })

  if (!existing) return null

  const [updated] = await db
    .update(schema.chatShares)
    .set({
      active: false,
      revokedAt: new Date()
    })
    .where(eq(schema.chatShares.id, existing.id))
    .returning()

  return toChatShareResponse(event, updated!)
}

/** Loads the current live read-only chat state for a public share token. */
export async function getPublicSharedChatOrThrow(token: string): Promise<PublicSharedChatResponse> {
  const share = await db.query.chatShares.findFirst({
    where: () => and(eq(schema.chatShares.token, token), eq(schema.chatShares.active, true))
  })

  if (!share || isExpired(share)) {
    throw createError({ statusCode: 404, statusMessage: 'Shared chat not found' })
  }

  const chat = await db.query.chats.findFirst({
    where: () => eq(schema.chats.id, share.chatId),
    with: {
      messages: {
        orderBy: () => asc(schema.messages.createdAt)
      }
    }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Shared chat not found' })
  }

  const messages = chat.messages.filter(message => message.role !== 'system').map(toPublicMessage)

  return {
    title: chat.title?.trim() || 'Shared chat',
    messages,
    sharedAt: share.createdAt,
    updatedAt: getLatestMessageDate(messages, chat.createdAt),
    isLive: true
  }
}

/**
 * Converts a raw `chatShares` row into the owner-facing API response shape,
 * computing the absolute public URL from the incoming request.
 */
function toChatShareResponse(event: H3Event, share: ChatShareRecord): ChatShareResponse {
  const path = getChatSharePath(share.token)

  return {
    token: share.token,
    path,
    url: new URL(path, getRequestURL(event).origin).toString(),
    isActive: share.active,
    mode: share.mode,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt
  }
}

/** Builds the relative path to the shared chat page for a given token. */
function getChatSharePath(token: string) {
  return `/share/chat/${token}`
}

/**
 * Generates a cryptographically random share token that is guaranteed unique
 * in the `chat_shares` table. Retries up to 5 times before giving up.
 */
async function generateUniqueChatShareToken() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateChatShareToken()
    const existing = await db.query.chatShares.findFirst({
      where: () => eq(schema.chatShares.token, token)
    })

    if (!existing) return token
  }

  throw createError({ statusCode: 500, statusMessage: 'Could not generate share link' })
}

/** Returns `true` when the share has an expiry date that has already passed. */
function isExpired(share: ChatShareRecord) {
  return Boolean(share.expiresAt && share.expiresAt.getTime() <= Date.now())
}

/**
 * Maps a raw message row to the public shape, filtering out internal
 * part types (reasoning, step-start, data-*) that should not be exposed.
 */
function toPublicMessage(
  message: MessageRecord
): Pick<UIMessage, 'id' | 'role' | 'parts'> & { createdAt: Date } {
  return {
    id: message.id,
    role: message.role as UIMessage['role'],
    parts: getPublicMessageParts(message.parts),
    createdAt: message.createdAt
  }
}

/**
 * Strips parts that are not suitable for public viewing.
 * Removes `reasoning`, `step-start`, and any `data-*` typed parts.
 */
function getPublicMessageParts(parts: unknown) {
  if (!Array.isArray(parts)) return []

  return parts.filter(part => {
    if (!part || typeof part !== 'object' || !('type' in part)) return false

    const type = String(part.type)
    return type !== 'reasoning' && type !== 'step-start' && !type.startsWith('data-')
  })
}

/** Reduces a message list to the single most-recent `createdAt` timestamp. */
function getLatestMessageDate(messages: Array<{ createdAt: Date }>, fallback: Date) {
  return messages.reduce(
    (latest, message) => (message.createdAt > latest ? message.createdAt : latest),
    fallback
  )
}
