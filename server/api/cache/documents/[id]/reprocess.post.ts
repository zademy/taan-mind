/**
 * Document Reprocess — POST /api/cache/documents/:id/reprocess
 *
 * Resets a document's processing status so it gets picked up again by
 * the document processor background plugin on its next cycle.
 *
 * All enrichment fields (`ocrContent`, `aiContent`, `processingModel`,
 * timestamps) are cleared so the processor starts from a clean state.
 *
 * @module server/api/cache
 */
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { ProcessingStatus } from '#shared/utils/processingStatus'

/**
 * POST /api/cache/documents/:id/reprocess
 *
 * Resets a document's processing status so it gets reprocessed.
 */
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing document ID' })
  }

  /**
   * Verify the document exists and reset all enrichment fields to trigger reprocessing.
   */
  await db
    .update(schema.paperlessDocuments)
    .set({
      processed: ProcessingStatus.Pending,
      ocrContent: null,
      aiContent: null,
      ocrMethod: null,
      processingModel: null,
      processingStartedAt: null,
      processingCompletedAt: null,
      updatedAt: new Date()
    })
    .where(eq(schema.paperlessDocuments.id, Number(id)))

  return { success: true, id: Number(id) }
})
