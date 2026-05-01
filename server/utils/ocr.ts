import type { H3Event } from 'h3'
import sharp from 'sharp'
import { parseOffice } from 'officeparser'
import ExcelJS from 'exceljs'
import { simpleParser } from 'mailparser'

/** Response from the Ollama `/api/generate` endpoint. */
interface OllamaGenerateResponse {
  /** Model name used for generation. */
  model: string
  /** Generated text response. */
  response: string
  /** Whether the generation is complete. */
  done: boolean
  /** Total generation duration in nanoseconds. */
  total_duration?: number
  /** Number of tokens evaluated during generation. */
  eval_count?: number
}

/** Response from the Ollama `/api/tags` endpoint listing available models. */
interface _OllamaTagsResponse {
  models: Array<{
    name: string
    model: string
    size: number
    digest: string
    modified_at: string
  }>
}

/** Represents the text extracted from a single page during OCR processing. */
interface OcrPageResult {
  /** 1-based page number. */
  page: number
  /** Extracted text content for this page. */
  text: string
}

/**
 * Result of OCR processing for a complete document.
 * Contains all extracted pages and metadata about the processing method.
 */
interface OcrResult {
  pages: OcrPageResult[]
  totalPages: number
  /** Whether the text was extracted via OCR or direct text extraction. */
  method: 'ocr' | 'text-extraction'
}

/** Image MIME types that can be converted to PNG for OCR processing (e.g., TIFF, GIF, BMP). */
export const CONVERTIBLE_IMAGE_TYPES = new Set([
  'image/tiff',
  'image/gif',
  'image/bmp'
])

/** Document MIME types that support direct text extraction without OCR (Office, TXT, CSV, EML, etc.). */
export const TEXT_EXTRACTABLE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/vnd.ms-powerpoint', // PPT
  'application/vnd.oasis.opendocument.text', // ODT
  'application/vnd.oasis.opendocument.spreadsheet', // ODS
  'application/vnd.oasis.opendocument.presentation', // ODP
  'text/rtf', // RTF
  'text/plain', // TXT
  'text/csv', // CSV
  'application/csv', // CSV alt
  'message/rfc822' // EML
])

/**
 * Creates a pre-configured `$fetch` instance for Ollama API calls.
 *
 * Reads the Ollama base URL from runtime config and throws a 500 error
 * if it is not configured.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns A `$fetch` instance scoped to the Ollama base URL.
 * @throws Throws a 500 error if `NUXT_OLLAMA_BASE_URL` is not set.
 */
export function useOcrClient(event: H3Event) {
  const config = useRuntimeConfig(event)
  const baseURL = config.ollamaBaseUrl
  if (!baseURL) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_OLLAMA_BASE_URL is not configured' })
  }
  return $fetch.create({ baseURL })
}

/**
 * Returns the configured OCR model name from runtime config.
 *
 * Falls back to `'glm-ocr:latest'` if no model is explicitly configured.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns The OCR model name string.
 */
export function getOcrModel(event: H3Event): string {
  const config = useRuntimeConfig(event)
  return config.ollamaModel || 'glm-ocr:latest'
}

/**
 * Sends an image to the Ollama API for text recognition (OCR).
 *
 * @param client - A pre-configured `$fetch` instance for Ollama.
 * @param model - The OCR model name to use.
 * @param imageBase64 - Base64-encoded image data.
 * @param prompt - The prompt to send along with the image (defaults to `'Text Recognition'`).
 * @returns The recognized text extracted from the image.
 */
export async function ocrImage(
  client: ReturnType<typeof $fetch.create>,
  model: string,
  imageBase64: string,
  prompt: string = 'Text Recognition'
): Promise<string> {
  const response = await client<OllamaGenerateResponse>('/api/generate', {
    method: 'POST',
    body: { model, prompt, images: [imageBase64], stream: false }
  })
  return response.response
}

/**
 * Converts an image buffer to PNG format using Sharp.
 *
 * @param buffer - The source image buffer (e.g., TIFF, GIF, BMP).
 * @returns A PNG-encoded buffer.
 */
export async function convertImageToPng(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).png().toBuffer()
}

/**
 * Extracts text content from a structured document (Office, TXT, CSV, EML).
 *
 * Dispatches to the appropriate parser based on the MIME type:
 * - **TXT/CSV**: Direct UTF-8 string decoding.
 * - **EML**: Parsed with `mailparser` (subject + body).
 * - **XLSX**: Parsed with `ExcelJS` (tabular data per sheet).
 * - **XLS**: Parsed with `officeparser`.
 * - **Other Office/ODF/RTF**: Parsed with `officeparser`.
 *
 * @param buffer - The document file buffer.
 * @param mimeType - The MIME type of the document.
 * @returns The extracted text content.
 */
export async function extractTextFromDocument(buffer: Buffer, mimeType: string): Promise<string> {
  // TXT/CSV: direct string decoding
  if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/csv') {
    return buffer.toString('utf-8')
  }
  // EML: parsed with mailparser (subject + body)
  if (mimeType === 'message/rfc822') {
    const parsed = await simpleParser(buffer)
    return [parsed.subject, parsed.text].filter(Boolean).join('\n')
  }
  // XLSX: parsed with ExcelJS (tabular data)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer)
    return workbook.worksheets.map((worksheet) => {
      const rows: string[] = []
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : []
        rows.push(values.map(v => v ?? '').join('\t'))
      })
      return `=== ${worksheet.name} ===\n${rows.join('\n')}`
    }).join('\n\n')
  }
  // XLS: parsed with officeparser
  if (mimeType === 'application/vnd.ms-excel') {
    const ast = await parseOffice(buffer)
    return ast.toText()
  }
  // Office documents (DOCX, PPTX, ODT, ODS, ODP, RTF, DOC, PPT): parsed with officeparser
  const ast = await parseOffice(buffer)
  return ast.toText()
}

/**
 * Converts each page of a PDF buffer to a base64-encoded PNG image.
 *
 * Uses MuPDF to render each page at 150 DPI for optimal OCR quality.
 *
 * @param pdfBuffer - The PDF file buffer.
 * @returns An array of base64-encoded PNG image strings, one per page.
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  const mupdf = await import('mupdf')
  const doc = mupdf.PDFDocument.openDocument(pdfBuffer, 'application/pdf')
  const numPages = doc.countPages()
  const images: string[] = []

  // DPI 150 for OCR: scale factor = 150/72 ≈ 2.08
  const scale = 150 / 72
  const matrix = mupdf.Matrix.scale(scale, scale)

  for (let i = 0; i < numPages; i++) {
    const page = doc.loadPage(i)
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true)
    const pngData = pixmap.asPNG()
    images.push(Buffer.from(pngData).toString('base64'))
  }

  return images
}

/**
 * Processes a document buffer and extracts text using the appropriate method.
 *
 * Determines the processing pipeline based on the MIME type:
 * 1. **Text-extractable** (Office, TXT, CSV, EML): Direct text extraction.
 * 2. **Convertible images** (TIFF, GIF, BMP): Convert to PNG then OCR.
 * 3. **PDF**: Convert pages to images then OCR each page.
 * 4. **Direct images** (PNG, JPEG, WebP): OCR directly.
 *
 * @param event - The H3 event used to create the OCR client.
 * @param fileBuffer - The document file buffer.
 * @param mimeType - The MIME type of the document.
 * @returns The OCR result with extracted pages and method used.
 */
export async function ocrDocument(
  event: H3Event,
  fileBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  // Step 1: Direct text extraction (Office, TXT, CSV, EML)
  if (TEXT_EXTRACTABLE_TYPES.has(mimeType)) {
    const text = await extractTextFromDocument(fileBuffer, mimeType)
    return {
      pages: [{ page: 1, text }],
      totalPages: 1,
      method: 'text-extraction'
    }
  }

  const client = useOcrClient(event)
  const model = getOcrModel(event)

  // Step 2: Convertible images (TIFF, GIF, BMP) → PNG → OCR
  if (CONVERTIBLE_IMAGE_TYPES.has(mimeType)) {
    const pngBuffer = await convertImageToPng(fileBuffer)
    const base64 = pngBuffer.toString('base64')
    const text = await ocrImage(client, model, base64, 'Text Recognition')
    return {
      pages: [{ page: 1, text }],
      totalPages: 1,
      method: 'ocr'
    }
  }

  // Step 3: PDF — convert pages to images then OCR
  if (mimeType === 'application/pdf') {
    const images = await pdfToImages(fileBuffer)
    const pages: OcrPageResult[] = []
    for (let i = 0; i < images.length; i++) {
      const text = await ocrImage(client, model, images[i]!, 'Text Recognition')
      pages.push({ page: i + 1, text })
    }
    return { pages, totalPages: images.length, method: 'ocr' }
  }

  // Direct images (PNG, JPEG, WebP)
  const base64 = fileBuffer.toString('base64')
  const text = await ocrImage(client, model, base64, 'Text Recognition')
  return {
    pages: [{ page: 1, text }],
    totalPages: 1,
    method: 'ocr'
  }
}
