import type { PaperlessDocument } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * PATCH /api/paperless/documents/:id
 *
 * Updates a document's metadata.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.coerce.number().int().positive()
    }).parse
  )

  const body = await readValidatedBody(
    event,
    z.object({
      /** Updated document title. */
      title: z.string().optional(),
      /** Correspondent ID to assign, or `null` to clear. */
      correspondent: z.number().nullable().optional(),
      /** Document type ID to assign, or `null` to clear. */
      document_type: z.number().nullable().optional(),
      /** Storage path ID to assign, or `null` to clear. */
      storage_path: z.number().nullable().optional(),
      /** Array of tag IDs to assign (replaces existing tags). */
      tags: z.array(z.number()).optional(),
      /** Archive serial number to assign, or `null` to clear. */
      archive_serial_number: z.number().nullable().optional(),
      /** Custom field values to set on the document. */
      custom_fields: z
        .array(
          z.object({
            /** Custom field definition ID. */
            field: z.number(),
            /** Field value (string, number, boolean, or null). */
            value: z.union([z.string(), z.number(), z.boolean(), z.null()])
          })
        )
        .optional()
    }).parse
  )

  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocument>(`/documents/${id}/`, {
      method: 'PATCH',
      body
    })
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to update document in Paperless')
  }
})
