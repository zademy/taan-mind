import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

/**
 * DELETE /api/cache/documents/:id
 *
 * Soft-deletes a document from the local SQLite cache by setting `deletedAt`.
 * This does not affect the document in Paperless-ngx.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const numId = Number(id)
  if (!id || !Number.isInteger(numId) || numId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid document ID' })
  }

  await db.update(schema.paperlessDocuments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.paperlessDocuments.id, numId))

  return { success: true, id: numId }
})
