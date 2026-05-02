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
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = formData.find(part => part.name === 'file')
  if (!file || !file.data || !file.type) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
  }

  if (!SUPPORTED_TYPES.has(file.type)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported file type: ${file.type}` })
  }

  const result = await ocrDocument(event, Buffer.from(file.data), file.type)
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
