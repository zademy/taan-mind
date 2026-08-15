import type {
  PaperlessCorrespondent,
  PaperlessDocument,
  PaperlessDocumentType,
  PaperlessPaginatedResponse,
  PaperlessTag
} from '#shared/types/paperless'
import type { DocumentProcessingSettings, ModelId } from '#shared/utils/models'
import { ProcessingStatus } from '#shared/utils/processingStatus'
import type { PaperlessFetchClient } from './paperless'
import { cleanText } from './textCleaner'

export interface ClaimedProcessingRecord {
  id: number
  title: string
  correspondent?: number | null
  documentType?: number | null
  processed: ProcessingStatus
  processingAttempts: number
}

export interface ProcessingRecordChanges {
  correspondent?: number | null
  documentType?: number | null
  ocrContent?: string
  aiContent?: string
  ocrMethod?: string
  processingModel?: string
  processed?: ProcessingStatus
  processingCompletedAt?: Date | null
  updatedAt: Date
}

export interface DocumentOcrResult {
  pages: { page: number; text: string }[]
  totalPages: number
  method: string
  model: string | null
  usage: unknown | null
}

export interface DocumentMetadataSuggestions {
  title: string | null
  tags: string[]
  correspondent: string | null
  document_type: string | null
}

type WarningLogger = (message: string, error: unknown) => void

export interface DocumentProcessingRunDependencies {
  paperless: PaperlessFetchClient
  setRecord: (documentId: number, changes: ProcessingRecordChanges) => Promise<void>
  getSettings: () => Promise<DocumentProcessingSettings>
  processOcr: (file: Buffer, mimeType: string) => Promise<DocumentOcrResult>
  formatContent: (input: {
    content: string
    title: string
    documentId: number
    model: ModelId
  }) => Promise<string>
  extractMetadata: (input: {
    content: string
    title: string
    documentId: number
    model: ModelId
  }) => Promise<DocumentMetadataSuggestions>
  warn?: WarningLogger
}

export type DocumentProcessingRun = (record: ClaimedProcessingRecord) => Promise<void>

async function findOrCreateCorrespondent(
  paperless: PaperlessFetchClient,
  name: string
): Promise<number> {
  const response = await paperless<PaperlessPaginatedResponse<PaperlessCorrespondent>>(
    '/correspondents/',
    { query: { name__icontains: name } }
  )
  const existing = response.results.find(item => item.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id
  return (
    await paperless<PaperlessCorrespondent>('/correspondents/', { method: 'POST', body: { name } })
  ).id
}

async function findOrCreateDocumentType(
  paperless: PaperlessFetchClient,
  name: string
): Promise<number> {
  const response = await paperless<PaperlessPaginatedResponse<PaperlessDocumentType>>(
    '/document_types/',
    { query: { name__icontains: name } }
  )
  const existing = response.results.find(item => item.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id
  return (
    await paperless<PaperlessDocumentType>('/document_types/', { method: 'POST', body: { name } })
  ).id
}

async function findOrCreateTags(
  paperless: PaperlessFetchClient,
  names: string[]
): Promise<number[]> {
  const response = await paperless<PaperlessPaginatedResponse<PaperlessTag>>('/tags/', {
    query: { page_size: 100 }
  })
  const ids: number[] = []
  for (const name of names) {
    const existing = response.results.find(item => item.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      ids.push(existing.id)
    } else {
      ids.push((await paperless<PaperlessTag>('/tags/', { method: 'POST', body: { name } })).id)
    }
  }
  return ids
}

async function getNextArchiveSerialNumber(paperless: PaperlessFetchClient): Promise<number> {
  const response = await paperless<PaperlessPaginatedResponse<PaperlessDocument>>('/documents/', {
    query: { ordering: '-archive_serial_number', page_size: 1 }
  })
  return (response.results?.[0]?.archive_serial_number ?? 0) + 1
}

/** Creates the complete processing behavior for one already-claimed Paperless document. */
export function createDocumentProcessingRun(
  dependencies: DocumentProcessingRunDependencies
): DocumentProcessingRun {
  const { paperless, setRecord, getSettings, processOcr, formatContent, extractMetadata } =
    dependencies
  const warn = dependencies.warn ?? (() => {})

  return async record => {
    const response = await paperless.raw<ArrayBuffer>(`/documents/${record.id}/download/`, {
      responseType: 'arrayBuffer'
    })
    if (!response._data) {
      throw new Error(`Paperless document #${record.id} download returned no data`)
    }
    const mimeType =
      response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream'
    const ocrResult = await processOcr(Buffer.from(response._data), mimeType)
    const cleanedOcrText = cleanText(ocrResult.pages.map(page => page.text).join('\n\n'))

    await setRecord(record.id, {
      ocrContent: cleanedOcrText,
      ocrMethod: ocrResult.method,
      updatedAt: new Date()
    })

    const { enrichmentModel } = await getSettings()
    const formattedContent = await formatContent({
      content: cleanedOcrText,
      title: record.title,
      documentId: record.id,
      model: enrichmentModel
    })
    const cleanedAiContent = cleanText(formattedContent)

    await setRecord(record.id, { aiContent: cleanedAiContent, updatedAt: new Date() })

    const metadata = await extractMetadata({
      content: cleanedAiContent,
      title: record.title,
      documentId: record.id,
      model: enrichmentModel
    })
    const paperlessDoc = await paperless<PaperlessDocument>(`/documents/${record.id}/`)
    let correspondentId = paperlessDoc.correspondent
    let documentTypeId = paperlessDoc.document_type
    let generatedTagIds: number[] = []
    if (!paperlessDoc.correspondent && metadata.correspondent) {
      try {
        correspondentId = await findOrCreateCorrespondent(paperless, metadata.correspondent)
      } catch (error) {
        warn(`Failed to resolve correspondent for document #${record.id}`, error)
      }
    }
    if (!paperlessDoc.document_type && metadata.document_type) {
      try {
        documentTypeId = await findOrCreateDocumentType(paperless, metadata.document_type)
      } catch (error) {
        warn(`Failed to resolve document type for document #${record.id}`, error)
      }
    }
    if (metadata.tags.length) {
      try {
        generatedTagIds = await findOrCreateTags(paperless, metadata.tags)
      } catch (error) {
        warn(`Failed to resolve tags for document #${record.id}`, error)
      }
    }
    const tagIds = [...new Set([...(paperlessDoc.tags || []), ...generatedTagIds])]
    let archiveSerialNumber = paperlessDoc.archive_serial_number
    if (!archiveSerialNumber) {
      try {
        archiveSerialNumber = await getNextArchiveSerialNumber(paperless)
      } catch (error) {
        warn(`Failed to resolve archive serial number for document #${record.id}`, error)
      }
    }
    const patchBody: Record<string, unknown> = {}
    if (!paperlessDoc.content) {
      patchBody.content = cleanedAiContent
    }
    if (
      (!paperlessDoc.title || paperlessDoc.title === paperlessDoc.original_file_name) &&
      metadata.title
    ) {
      patchBody.title = metadata.title
    }
    if (!paperlessDoc.correspondent && correspondentId) {
      patchBody.correspondent = correspondentId
    }
    if (!paperlessDoc.document_type && documentTypeId) {
      patchBody.document_type = documentTypeId
    }
    if (tagIds.length) {
      patchBody.tags = tagIds
    }
    if (!paperlessDoc.archive_serial_number && archiveSerialNumber) {
      patchBody.archive_serial_number = archiveSerialNumber
    }
    if (paperlessDoc.storage_path) {
      patchBody.storage_path = paperlessDoc.storage_path
    }

    let paperlessUpdated = false
    if (Object.keys(patchBody).length) {
      try {
        await paperless<PaperlessDocument>(`/documents/${record.id}/`, {
          method: 'PATCH',
          body: patchBody
        })
        paperlessUpdated = true
      } catch (error) {
        warn(`Failed to update Paperless document #${record.id}`, error)
      }
    }

    await setRecord(record.id, {
      processed: ProcessingStatus.Processed,
      correspondent: paperlessUpdated
        ? (correspondentId ?? record.correspondent)
        : paperlessDoc.correspondent,
      documentType: paperlessUpdated
        ? (documentTypeId ?? record.documentType)
        : paperlessDoc.document_type,
      processingModel: enrichmentModel,
      processingCompletedAt: new Date(),
      updatedAt: new Date()
    })
  }
}
