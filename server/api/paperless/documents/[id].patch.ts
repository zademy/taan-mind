import type { PaperlessDocument } from '~~/shared/types/paperless'
import { z } from 'zod'

/**
 * PATCH /api/paperless/documents/:id
 *
 * Updates a document's metadata.
 */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.coerce.number().int().positive()
  }).parse)

  const body = await readValidatedBody(event, z.object({
    title: z.string().optional(),
    correspondent: z.number().nullable().optional(),
    document_type: z.number().nullable().optional(),
    storage_path: z.number().nullable().optional(),
    tags: z.array(z.number()).optional(),
    archive_serial_number: z.number().nullable().optional(),
    custom_fields: z.array(z.object({
      field: z.number(),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()])
    })).optional()
  }).parse)

  const client = usePaperlessClient(event)

  try {
    return await client<PaperlessDocument>(`/documents/${id}/`, {
      method: 'PATCH',
      body
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to update document in Paperless'
    })
  }
})
