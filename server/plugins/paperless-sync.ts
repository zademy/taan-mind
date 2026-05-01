import { consola } from 'consola'
import type { PaperlessDocument, PaperlessPaginatedResponse } from '~~/shared/types/paperless'

/**
 * Nitro plugin that periodically syncs Paperless-ngx documents into the local SQLite cache.
 *
 * - Starts after the first HTTP request (ensures DB is ready).
 * - Uses upsert (insert + onConflictDoUpdate) to keep metadata fresh.
 * - Preserves the `processed` flag on existing rows.
 * - Interval is configurable via NUXT_SYNC_INTERVAL_MS (default 5000ms).
 */
export default defineNitroPlugin((nitroApp) => {
  let syncInterval: ReturnType<typeof setInterval> | null = null
  let isSyncing = false

  nitroApp.hooks.hook('request', async () => {
    if (syncInterval) return

    const config = useRuntimeConfig()
    const intervalMs = Number(config.syncIntervalMs) || 5000

    const baseUrl = config.paperlessBaseUrl?.replace(/\/+$/, '')
    const token = config.paperlessApiToken
    if (!baseUrl || !token) {
      consola.warn('[Paperless Sync] Not configured (NUXT_PAPERLESS_BASE_URL or NUXT_PAPERLESS_API_TOKEN is missing)')
      return
    }

    consola.info(`[Paperless Sync] Starting synchronization every ${intervalMs}ms`)

    const sync = async () => {
      if (isSyncing) return
      isSyncing = true

      try {
        const { db, schema } = await import('hub:db')

        let page = 1
        let hasMore = true

        while (hasMore) {
          const response = await $fetch<PaperlessPaginatedResponse<PaperlessDocument>>(`${baseUrl}/api/documents/`, {
            headers: {
              Authorization: `Token ${token}`,
              Accept: 'application/json; version=5'
            },
            query: { page, page_size: 100 }
          })

          const docs = response.results || []

          for (const doc of docs) {
            await db.insert(schema.paperlessDocuments)
              .values({
                id: doc.id,
                title: doc.title,
                correspondent: doc.correspondent,
                documentType: doc.document_type,
                storagePath: doc.storage_path,
                originalFileName: doc.original_file_name,
                mimeType: doc.mime_type,
                pageCount: doc.page_count,
                processed: 0,
                paperlessCreated: doc.created ? new Date(doc.created) : null,
                paperlessModified: doc.modified ? new Date(doc.modified) : null
              })
              .onConflictDoUpdate({
                target: schema.paperlessDocuments.id,
                set: {
                  title: doc.title,
                  correspondent: doc.correspondent,
                  documentType: doc.document_type,
                  storagePath: doc.storage_path,
                  originalFileName: doc.original_file_name,
                  mimeType: doc.mime_type,
                  pageCount: doc.page_count,
                  paperlessCreated: doc.created ? new Date(doc.created) : null,
                  paperlessModified: doc.modified ? new Date(doc.modified) : null,
                  updatedAt: new Date()
                }
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
