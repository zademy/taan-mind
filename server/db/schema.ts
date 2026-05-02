import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

/**
 * Shared timestamp columns used across all tables.
 * Automatically sets the current date on insert.
 */
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
}

/**
 * Chats table — stores conversation metadata.
 * Each chat is owned by a user identified by their session cookie.
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
    documentId: integer('document_id'),
    ...timestamps
  },
  table => [index('chats_user_id_idx').on(table.userId)]
)

/** Defines the one-to-many relationship between a chat and its messages. */
export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages)
}))

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

/** Defines the many-to-one relationship between a message and its chat. */
export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  })
}))

/**
 * Custom personalities table — stores user-defined markdown prompts.
 * Each record is owned by the anonymous session ID stored in cookies.
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
    processed: integer('processed').notNull().default(0),
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
