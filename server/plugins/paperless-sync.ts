/**
 * Paperless Sync Plugin
 *
 * Background plugin that periodically fetches all documents from
 * Paperless-ngx and upserts them into the local SQLite cache.
 *
 * Runs every `NUXT_SYNC_INTERVAL_MS` milliseconds (default 5s).
 * Processes documents in pages of 100. Preserves the `processed` flag
 * on existing rows so enrichment state is not lost.
 *
 * @module server/plugins
 */

import { consola } from 'consola'
import { isNull, sql } from 'drizzle-orm'
import type { PaperlessDocument, PaperlessPaginatedResponse } from '~~/shared/types/paperless'
import { ProcessingStatus } from '#shared/utils/processingStatus'

const excluded = (columnName: string) => sql.raw(`excluded.${columnName}`)

const toPaperlessDocumentRow = (doc: PaperlessDocument) => ({
  id: doc.id,
  title: doc.title,
  correspondent: doc.correspondent,
  documentType: doc.document_type,
  storagePath: doc.storage_path,
  originalFileName: doc.original_file_name,
  mimeType: doc.mime_type,
  pageCount: doc.page_count,
  processed: ProcessingStatus.Pending,
  paperlessCreated: doc.created ? new Date(doc.created) : null,
  paperlessModified: doc.modified ? new Date(doc.modified) : null
})

/**
 * Nitro plugin that periodically syncs Paperless-ngx documents into the local SQLite cache.
 *
 * - Starts after the first HTTP request (ensures DB is ready).
 * - Uses upsert (insert + onConflictDoUpdate) to keep metadata fresh.
 * - Preserves the `processed` flag on existing rows.
 * - Interval is configurable via NUXT_SYNC_INTERVAL_MS (default 5000ms).
 */
export default defineNitroPlugin(nitroApp => {
  let syncInterval: ReturnType<typeof setInterval> | null = null
  let isSyncing = false

  nitroApp.hooks.hook('request', async () => {
    if (syncInterval) return

    const config = useRuntimeConfig()
    const intervalMs = Number(config.syncIntervalMs) || 5000

    const paperlessConfig = getOptionalPaperlessConfig()
    if (!paperlessConfig) {
      consola.warn(`[Paperless Sync] Not configured (${PAPERLESS_CONFIG_MISSING_MESSAGE})`)
      return
    }
    const { apiBaseUrl, jsonHeaders } = paperlessConfig

    consola.info(`[Paperless Sync] Starting synchronization every ${intervalMs}ms`)

    const sync = async () => {
      if (isSyncing) return
      isSyncing = true

      try {
        const { db, schema } = await import('hub:db')

        let page = 1
        let hasMore = true

        while (hasMore) {
          const response = await $fetch<PaperlessPaginatedResponse<PaperlessDocument>>(
            `${apiBaseUrl}/documents/`,
            {
              headers: jsonHeaders,
              query: { page, page_size: 100 }
            }
          )

          const docs = response.results || []
          const documentRows = docs.map(toPaperlessDocumentRow)

          if (documentRows.length > 0) {
            await db
              .insert(schema.paperlessDocuments)
              .values(documentRows)
              .onConflictDoUpdate({
                target: schema.paperlessDocuments.id,
                set: {
                  title: excluded('title'),
                  correspondent: excluded('correspondent'),
                  documentType: excluded('document_type'),
                  storagePath: excluded('storage_path'),
                  originalFileName: excluded('original_file_name'),
                  mimeType: excluded('mime_type'),
                  pageCount: excluded('page_count'),
                  paperlessCreated: excluded('paperless_created'),
                  paperlessModified: excluded('paperless_modified'),
                  updatedAt: new Date()
                },
                setWhere: isNull(schema.paperlessDocuments.deletedAt)
              })
          }

          hasMore = !!response.next
          page++
        }
      } catch (error) {
        consola.error('[Paperless Sync] Error:', error instanceof Error ? error.message : error)
      } finally {
        isSyncing = false
      }
    }

    sync()

    syncInterval = setInterval(sync, intervalMs)
  })

  nitroApp.hooks.hook('close', () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
      consola.info('[Paperless Sync] Stopped')
    }
  })
})
