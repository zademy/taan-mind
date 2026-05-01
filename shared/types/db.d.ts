/**
 * Database type definitions.
 * Re-exports inferred types from the Drizzle ORM schema so they can be
 * shared across server routes, composables, and Vue components.
 */
import type { chats, messages } from 'hub:db:schema'

/** Inferred select (read) type for the `chats` table. */
export type Chat = typeof chats.$inferSelect

/** Inferred select (read) type for the `messages` table. */
export type Message = typeof messages.$inferSelect
