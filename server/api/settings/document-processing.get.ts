import type { DocumentProcessingSettings } from '#shared/utils/models'
import { getDocumentProcessingSettings } from '../../utils/documentProcessingSettings'

/**
 * GET /api/settings/document-processing
 *
 * Returns the global model used after OCR to format document content and enrich
 * Paperless metadata.
 *
 * @module server/api/settings
 */
export default defineEventHandler(async (): Promise<DocumentProcessingSettings> => {
  return getDocumentProcessingSettings()
})
