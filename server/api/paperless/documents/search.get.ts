/**
 * GET /api/paperless/documents/search
 *
 * Search autocomplete. Forwards term and limit to GET /search/autocomplete/.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const client = usePaperlessClient(event)

  const params = buildPaperlessQuery({
    term: query.term as string | undefined,
    limit: query.limit as string | undefined
  })

  if (!params.term) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query parameter "term" is required'
    })
  }

  try {
    return await client<string[]>('/search/autocomplete/' as string, { query: params })
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to search in Paperless'
    })
  }
})
