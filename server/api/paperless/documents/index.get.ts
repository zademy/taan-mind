import type { PaperlessDocument, PaperlessPaginatedResponse } from '~~/shared/types/paperless'

/**
 * GET /api/paperless/documents
 *
 * Lists documents with pagination and filters.
 * Forwards query params to Paperless GET /documents/.
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)

  const client = usePaperlessClient(event)

  const params = buildPaperlessQuery({
    page: query.page as string | undefined,
    page_size: query.page_size as string | undefined,
    ordering: query.ordering as string | undefined,
    query: query.query as string | undefined,
    correspondent__id: query.correspondent__id as string | undefined,
    document_type__id: query.document_type__id as string | undefined,
    storage_path__id: query.storage_path__id as string | undefined,
    tags__id__in: query.tags__id__in as string | undefined,
    tags__id__none: query.tags__id__none as string | undefined,
    is_in_inbox: query.is_in_inbox as string | undefined,
    title__icontains: query.title__icontains as string | undefined,
    content__icontains: query.content__icontains as string | undefined
  })

  try {
    return await client<PaperlessPaginatedResponse<PaperlessDocument>>('/documents/', {
      query: params
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch documents from Paperless'
    })
  }
})
