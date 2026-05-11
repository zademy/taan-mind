/**
 * Database type definitions.
 * Re-exports inferred types from the Drizzle ORM schema so they can be
 * shared across server routes, composables, and Vue components.
 */
import type { chats, messages, chatShares, projects } from 'hub:db:schema'

/** Inferred select (read) type for the `chats` table. */
export type Chat = typeof chats.$inferSelect

/** Inferred select (read) type for the `messages` table. */
export type Message = typeof messages.$inferSelect

/** Inferred select (read) type for the `chat_shares` table. */
export type ChatShare = typeof chatShares.$inferSelect

/** Inferred select (read) type for the `projects` table. */
export type Project = typeof projects.$inferSelect
