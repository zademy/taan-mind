import { describe, expect, it, vi } from 'vitest'
import type { PaperlessDocument } from '#shared/types/paperless'
import { ProcessingStatus } from '#shared/utils/processingStatus'
import { createDocumentProcessingRun } from './documentProcessingRun'

describe('document-processing run', () => {
  it('processes one claimed record through OCR, enrichment, and Paperless update', async () => {
    const record = {
      id: 42,
      title: 'Original title',
      processed: ProcessingStatus.Processing,
      processingAttempts: 1
    }
    const paperlessDocument = {
      id: 42,
      title: 'Original title',
      content: '',
      correspondent: null,
      document_type: null,
      storage_path: null,
      tags: [],
      archive_serial_number: null,
      mime_type: 'application/pdf'
    } as unknown as PaperlessDocument
    const setRecord = vi.fn(async () => {})
    const paperless = vi.fn(async (path: string, options?: { method?: string; body?: unknown }) => {
      if (path.endsWith('/download/')) return new ArrayBuffer(8)
      if (path === '/documents/') return { results: [] }
      if (options?.method === 'PATCH') return paperlessDocument
      return paperlessDocument
    })
    const fetchRaw = vi.fn(async () => ({
      _data: new ArrayBuffer(8),
      headers: new Headers({ 'content-type': 'application/pdf' })
    }))
    Object.assign(paperless, { raw: fetchRaw })
    const processOcr = vi.fn(async () => ({
      pages: [{ page: 1, text: '  Extracted text  ' }],
      totalPages: 1,
      method: 'ocr',
      model: null,
      usage: null
    }))
    const formatContent = vi.fn(async () => '  Formatted content  ')
    const extractMetadata = vi.fn(async () => ({
      title: null,
      tags: [],
      correspondent: null,
      document_type: null
    }))

    const run = createDocumentProcessingRun({
      paperless: paperless as never,
      setRecord,
      getSettings: async () => ({ enrichmentModel: 'openai/gpt-5.4-mini' }),
      processOcr,
      formatContent,
      extractMetadata
    })

    await run(record)

    expect(fetchRaw).toHaveBeenCalledWith('/documents/42/download/', {
      responseType: 'arrayBuffer'
    })
    expect(processOcr).toHaveBeenCalledWith(expect.any(Buffer), 'application/pdf')
    expect(setRecord).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        ocrContent: 'Extracted text',
        ocrMethod: 'ocr'
      })
    )
    expect(formatContent).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Extracted text',
        documentId: 42,
        model: 'openai/gpt-5.4-mini'
      })
    )
    expect(paperless).toHaveBeenCalledWith(
      '/documents/42/',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ content: 'Formatted content' })
      })
    )
    expect(setRecord.mock.invocationCallOrder[0]).toBeLessThan(
      formatContent.mock.invocationCallOrder[0]!
    )
    expect(setRecord).toHaveBeenLastCalledWith(
      42,
      expect.objectContaining({
        processed: ProcessingStatus.Processed,
        processingModel: 'openai/gpt-5.4-mini'
      })
    )
  })
})
