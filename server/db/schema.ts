/**
 * @file SQLite database schema definitions.
 *
 * Defines all tables (chats, messages, custom personalities, app settings,
 * Paperless document cache), their relations, indexes, and shared column
 * helpers using Drizzle ORM's SQLite adapter.
 */
import { sqliteTable, text, integer, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { ProcessingStatus } from '../../shared/utils/processingStatus'

/**
 * Shared timestamp columns used across all tables.
 * Automatically sets the current date on insert.
 */
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
}

const updatedAt = integer('updated_at', { mode: 'timestamp' })
  .notNull()
  .$defaultFn(() => new Date())

/**
 * Better Auth users table.
 *
 * The table name and field names intentionally match Better Auth defaults so
 * the Drizzle adapter can map auth data without custom model aliases.
 */
export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    createdAt: timestamps.createdAt,
    updatedAt,
    role: text('role').notNull().default('user'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    banReason: text('ban_reason'),
    banExpires: integer('ban_expires', { mode: 'timestamp' })
  },
  table => [
    uniqueIndex('user_email_unique_idx').on(table.email),
    index('user_role_idx').on(table.role)
  ]
)

/**
 * Better Auth sessions table.
 */
export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamps.createdAt,
    updatedAt,
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by')
  },
  table => [
    uniqueIndex('session_token_unique_idx').on(table.token),
    index('session_user_id_idx').on(table.userId)
  ]
)

/**
 * Better Auth accounts table.
 */
export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamps.createdAt,
    updatedAt
  },
  table => [index('account_user_id_idx').on(table.userId)]
)

/**
 * Better Auth verification table.
 */
export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: timestamps.createdAt,
    updatedAt
  },
  table => [index('verification_identifier_idx').on(table.identifier)]
)

/**
 * Projects table — user-owned workspaces that group related chats.
 * Chats can belong to one project or remain standalone.
 */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    ...timestamps
  },
  table => [
    index('projects_user_id_idx').on(table.userId),
    index('projects_created_at_idx').on(table.createdAt)
  ]
)

/**
 * Chats table — stores conversation metadata.
 * Each chat is owned by a Better Auth user ID.
 */
export const chats = sqliteTable(
  'chats',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text('title'),
    userId: text('user_id').notNull(),
    visibility: text('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    personality: text('personality').notNull().default('friendly'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    documentId: integer('document_id'),
    ...timestamps
  },
  table => [
    index('chats_user_id_idx').on(table.userId),
    index('chats_project_id_idx').on(table.projectId)
  ]
)

/**
 * Messages table — stores individual messages within a chat.
 * Messages are cascading-deleted when their parent chat is removed.
 */
export const messages = sqliteTable(
  'messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    parts: text('parts', { mode: 'json' }),
    ...timestamps
  },
  table => [index('messages_chat_id_idx').on(table.chatId)]
)

/**
 * Chat shares table — stores revocable public read-only links for chats.
 * Tokens are opaque and separate from the internal chat ID.
 */
export const chatShares = sqliteTable(
  'chat_shares',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    token: text('token').notNull(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    ownerUserId: text('owner_user_id').notNull(),
    mode: text('mode', { enum: ['live'] })
      .notNull()
      .default('live'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    ...timestamps
  },
  table => [
    uniqueIndex('chat_shares_token_unique_idx').on(table.token),
    uniqueIndex('chat_shares_chat_id_unique_idx').on(table.chatId),
    index('chat_shares_owner_user_id_idx').on(table.ownerUserId),
    index('chat_shares_active_idx').on(table.active)
  ]
)

/** Defines the many-to-one relationship between a message and its chat. */
export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  })
}))

/** Defines the many-to-one relationship between a share link and its chat. */
export const chatSharesRelations = relations(chatShares, ({ one }) => ({
  chat: one(chats, {
    fields: [chatShares.chatId],
    references: [chats.id]
  })
}))

/**
 * Custom personalities table — stores user-defined markdown prompts.
 * Each record is owned by a Better Auth user ID.
 */
export const customPersonalities = sqliteTable(
  'custom_personalities',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    label: text('label').notNull(),
    prompt: text('prompt').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
  },
  table => [index('custom_personalities_user_id_idx').on(table.userId)]
)

/**
 * Application settings table — stores server-side configuration edited from the UI.
 * Settings are global because background processors run outside a user request.
 */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

/**
 * Paperless documents table — caches document metadata from Paperless-ngx.
 * The `id` matches the Paperless document ID (not auto-generated).
 */
export const paperlessDocuments = sqliteTable(
  'paperless_documents',
  {
    id: integer('id').primaryKey(),
    title: text('title').notNull(),
    correspondent: integer('correspondent'),
    documentType: integer('document_type'),
    storagePath: integer('storage_path'),
    originalFileName: text('original_file_name'),
    mimeType: text('mime_type'),
    pageCount: integer('page_count'),
    ocrContent: text('ocr_content'),
    aiContent: text('ai_content'),
    ocrMethod: text('ocr_method'),
    processingModel: text('processing_model'),
    processed: integer('processed').notNull().default(ProcessingStatus.Pending),
    processingStartedAt: integer('processing_started_at', { mode: 'timestamp' }),
    processingCompletedAt: integer('processing_completed_at', { mode: 'timestamp' }),
    paperlessCreated: integer('paperless_created', { mode: 'timestamp' }),
    paperlessModified: integer('paperless_modified', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' })
  },
  table => [
    index('paperless_docs_processed_idx').on(table.processed),
    index('paperless_docs_updated_idx').on(table.updatedAt)
  ]
)

/**
 * Chat documents join table — stores up to five Paperless documents attached
 * to a chat as persistent context, preserving selection order.
 */
export const chatDocuments = sqliteTable(
  'chat_documents',
  {
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    documentId: integer('document_id')
      .notNull()
      .references(() => paperlessDocuments.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    ...timestamps
  },
  table => [
    primaryKey({ columns: [table.chatId, table.documentId] }),
    index('chat_documents_chat_id_idx').on(table.chatId),
    index('chat_documents_document_id_idx').on(table.documentId)
  ]
)

/** Defines the relationships between a chat and its records/project. */
export const chatsRelations = relations(chats, ({ one, many }) => ({
  project: one(projects, {
    fields: [chats.projectId],
    references: [projects.id]
  }),
  messages: many(messages),
  documents: many(chatDocuments),
  shares: many(chatShares)
}))

/** Defines the one-to-many relationship between a project and its chats. */
export const projectsRelations = relations(projects, ({ many }) => ({
  chats: many(chats)
}))

/** Defines the many-to-one relationships for chat document attachments. */
export const chatDocumentsRelations = relations(chatDocuments, ({ one }) => ({
  chat: one(chats, {
    fields: [chatDocuments.chatId],
    references: [chats.id]
  }),
  document: one(paperlessDocuments, {
    fields: [chatDocuments.documentId],
    references: [paperlessDocuments.id]
  })
}))
