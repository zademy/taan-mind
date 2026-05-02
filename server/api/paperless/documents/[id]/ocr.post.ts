import { z } from 'zod'
import { CONVERTIBLE_IMAGE_TYPES, TEXT_EXTRACTABLE_TYPES } from '~~/server/utils/ocr'

const OCR_IMAGE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

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

  const config = useRuntimeConfig(event)
  const baseURL = config.paperlessBaseUrl?.replace(/\/+$/, '')
  const token = config.paperlessApiToken

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_BASE_URL is not configured'
    })
  }

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_API_TOKEN is not configured'
    })
  }

  // Download binary from Paperless
  const response = await $fetch
    .raw(`${baseURL}/api/documents/${id}/download/` as string, {
      headers: {
        Authorization: `Token ${token}`
      },
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
