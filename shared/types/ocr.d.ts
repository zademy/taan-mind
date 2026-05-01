/** Represents the text extracted from a single page during OCR processing. */
interface OcrPageResult {
  /** 1-based page number. */
  page: number
  /** Extracted text content for this page. */
  text: string
}

/**
 * Response returned when extracting text from an uploaded file via OCR.
 * Contains the extracted text organized by pages and the method used.
 */
interface OcrExtractResponse {
  /** Original filename of the uploaded file. */
  filename: string
  /** MIME type of the uploaded file. */
  contentType: string
  /** Method used to extract text: `'ocr'` for image-based or `'text-extraction'` for structured documents. */
  method: 'ocr' | 'text-extraction'
  /** OCR results grouped by page. */
  ocr: {
    pages: OcrPageResult[]
    totalPages: number
  }
}

/**
 * Response returned when processing a Paperless document via OCR.
 * Similar to {@link OcrExtractResponse} but references a document by ID
 * instead of an uploaded filename.
 */
interface OcrDocumentResponse {
  /** Paperless-ngx document ID. */
  documentId: number
  /** MIME type of the processed document. */
  contentType: string
  /** Method used to extract text: `'ocr'` for image-based or `'text-extraction'` for structured documents. */
  method: 'ocr' | 'text-extraction'
  /** OCR results grouped by page. */
  ocr: {
    pages: OcrPageResult[]
    totalPages: number
  }
}

/**
 * Response from the OCR service health check endpoint.
 * Indicates whether the Ollama instance is reachable and the required model is available.
 */
interface OcrHealthResponse {
  /** Health status: `'ok'` when the service is reachable, `'error'` otherwise. */
  status: 'ok' | 'error'
  /** Name of the configured OCR model. */
  model: string
  /** Whether the required OCR model is available in Ollama. */
  available: boolean
  /** Optional error message when the service is unhealthy. */
  message?: string
}

/** Represents an OCR model available in the Ollama instance. */
interface OcrModel {
  /** Model name (e.g., `'glm-ocr:latest'`). */
  name: string
  /** Model file size in bytes. */
  size: number
  /** ISO 8601 timestamp of when the model was last modified. */
  modified_at: string
}

/** Response from the OCR models listing endpoint. */
interface OcrModelsResponse {
  /** List of available OCR models in the Ollama instance. */
  models: OcrModel[]
}
