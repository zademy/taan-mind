import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

/**
 * POST /api/cache/documents/:id/reprocess
 *
 * Resets a document's processed status to 0 so it gets reprocessed.
 */
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing document ID' })
  }

  await db
    .update(schema.paperlessDocuments)
    .set({
      processed: 0,
      ocrContent: null,
      aiContent: null,
      ocrMethod: null,
      processingStartedAt: null,
      processingCompletedAt: null,
      updatedAt: new Date()
    })
    .where(eq(schema.paperlessDocuments.id, Number(id)))

  return { success: true, id: Number(id) }
})
