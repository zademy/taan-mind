/**
 * Document OCR — POST /api/paperless/documents/:id/ocr
 *
 * Downloads a document from Paperless and runs it through the Ollama OCR
 * pipeline (GLM-OCR) to extract text. Supports PDF, PNG, JPEG, WebP,
 * TIFF, GIF, BMP, DOCX, PPTX, ODT, XLSX, EML, and MSG files.
 *
 * @module server/api/paperless
 */

import { z } from 'zod'
import { CONVERTIBLE_IMAGE_TYPES, TEXT_EXTRACTABLE_TYPES } from '~~/server/utils/ocr'

/** MIME types that can be sent directly to the OCR engine as images. */
const OCR_IMAGE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

/** Combined set of all file types supported for OCR processing. */
const SUPPORTED_TYPES = new Set([
  ...OCR_IMAGE_TYPES,
  ...CONVERTIBLE_IMAGE_TYPES,
  ...TEXT_EXTRACTABLE_TYPES
])

/**
 * POST /api/paperless/documents/:id/ocr
 *
 * Downloads a document from Paperless and processes it with OCR (Ollama GLM-OCR).
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.coerce.number().int().positive()
    }).parse
  )

  const { apiBaseUrl, authHeaders } = getPaperlessConfig(event)

  // Download binary from Paperless
  const response = await $fetch
    .raw(`${apiBaseUrl}/documents/${id}/download/` as string, {
      headers: authHeaders,
      responseType: 'arrayBuffer'
    })
    .catch((error: unknown) => {
      const err = error as { statusCode?: number }
      throw createError({
        statusCode: err?.statusCode === 404 ? 404 : err?.statusCode || 502,
        statusMessage:
          err?.statusCode === 404
            ? `Document ${id} not found in Paperless`
            : 'Failed to download document from Paperless'
      })
    })

  const contentType = (response.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]!
    .trim()

  if (!SUPPORTED_TYPES.has(contentType)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported file type for OCR: ${contentType}. Supported: ${[...SUPPORTED_TYPES].join(', ')}`
    })
  }

  const buffer = Buffer.from(response._data as ArrayBuffer)

  // Process OCR via Ollama
  const ocr = await ocrDocument(event, buffer, contentType).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'OCR processing failed (Ollama)'
    throw createError({
      statusCode: 502,
      statusMessage: message
    })
  })

  return {
    documentId: id,
    contentType,
    method: ocr.method,
    ocr: {
      pages: ocr.pages,
      totalPages: ocr.totalPages
    }
  }
})
