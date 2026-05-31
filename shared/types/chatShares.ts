import type { UIMessage } from 'ai'

/** Share mode supported by public chat links. */
export type ChatShareMode = 'live'

/**
 * Owner-facing share-link representation returned by chat share API routes.
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
  mode: ChatShareMode
  /** When the share link was first created. */
  createdAt: string
  /** Optional expiry timestamp; `null` means the link never expires. */
  expiresAt: string | null
  /** When the share was revoked; `null` if still active. */
  revokedAt: string | null
}

/** Standard wrapper returned by owner chat-share mutation/query endpoints. */
export type ChatSharePayload = {
  share: ChatShareResponse | null
}

/** Public message shape exposed to anonymous shared-chat viewers. */
export type PublicSharedChatMessage = Pick<UIMessage, 'id' | 'role' | 'parts'> & {
  /** Message creation timestamp serialized as ISO-8601. */
  createdAt: string
}

/**
 * Public-facing representation returned by `GET /api/shared-chats/:token`.
 * Contains only anonymous-viewer-safe data — no internal IDs or owner info.
 */
export type PublicSharedChatResponse = {
  /** Chat title displayed on the shared page. */
  title: string
  /** Non-system messages ordered chronologically, with filtered parts. */
  messages: PublicSharedChatMessage[]
  /** When the share link was originally created. */
  sharedAt: string
  /** Timestamp of the most recent message, or chat creation as fallback. */
  updatedAt: string
  /** Indicates the share reflects the live chat state. */
  isLive: true
}
