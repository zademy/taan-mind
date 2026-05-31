/**
 * Update Document Processing Settings — PATCH /api/settings/document-processing
 *
 * Updates the global AI enrichment model used by the background document
 * processor. Validates the model is available before persisting the change.
 *
 * @module server/api/settings
 */

import { z } from 'zod'
import type { DocumentProcessingSettings, ModelId } from '#shared/utils/models'
import { isDocumentProcessingModel } from '#shared/utils/models'
import { setDocumentProcessingEnrichmentModel } from '../../utils/documentProcessingSettings'
import { assertLanguageModelAvailable } from '../../utils/aiModels'

const documentProcessingSettingsBodySchema = z.object({
  /** Model identifier in `provider/modelId` format used for document enrichment. */
  enrichmentModel: z.string().refine(isDocumentProcessingModel, {
    message: 'Unsupported enrichment model'
  })
})

/**
 * PATCH /api/settings/document-processing
 *
 * Updates the global model used after OCR to format document content and enrich
 * Paperless metadata.
 */
export default defineEventHandler(async (event): Promise<DocumentProcessingSettings> => {
  const body = await readValidatedBody(event, documentProcessingSettingsBodySchema.parse)
  const enrichmentModel = body.enrichmentModel as ModelId

  await assertLanguageModelAvailable(enrichmentModel, event)

  return setDocumentProcessingEnrichmentModel(enrichmentModel)
})
