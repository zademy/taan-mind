/** Set of MIME types that can be directly OCR'd as images (PDF, PNG, JPEG, WebP). */
const OCR_IMAGE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

/** Combined set of all MIME types supported for OCR/extraction processing. */
const SUPPORTED_TYPES = new Set([
  ...OCR_IMAGE_TYPES,
  ...CONVERTIBLE_IMAGE_TYPES,
  ...TEXT_EXTRACTABLE_TYPES
])

/**
 * POST /api/ocr/extract
 *
 * Accepts a multipart file upload and extracts text using OCR or
 * direct text extraction depending on the file type.
 *
 * Supported file types include PDF, images (PNG, JPEG, WebP, TIFF, GIF, BMP),
 * Office documents (DOCX, XLSX, PPTX, ODT, etc.), TXT, CSV, and EML.
 *
 * @returns The extracted text grouped by pages along with the method used.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)

  // Parse the multipart form data from the request
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  // Locate the file field in the form data
  const file = formData.find(part => part.name === 'file')
  if (!file || !file.data || !file.type) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
  }

  // Validate that the file's MIME type is supported
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported file type: ${file.type}` })
  }

  // Process the file buffer using the OCR pipeline
  const result = await ocrDocument(event, Buffer.from(file.data), file.type)

  if (result.model && result.usage) {
    await recordAIUsage({
      userId,
      model: result.model,
      operation: 'ocr',
      usage: result.usage,
      finishReason: 'stop'
    })
  }

  return {
    filename: file.filename,
    contentType: file.type,
    method: result.method,
    ocr: {
      pages: result.pages,
      totalPages: result.totalPages
    }
  }
})
