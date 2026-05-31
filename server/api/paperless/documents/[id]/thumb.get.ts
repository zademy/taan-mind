import { z } from 'zod'

/**
 * GET /api/paperless/documents/:id/thumb
 *
 * Returns document thumbnail image.
 * Proxies binary response from Paperless.
 *
 * @module server/api/paperless
 */
export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.coerce.number().int().positive()
    }).parse
  )

  const { apiBaseUrl, authHeaders } = getPaperlessConfig(event)

  try {
    const response = await $fetch.raw(`${apiBaseUrl}/documents/${id}/thumb/`, {
      headers: authHeaders,
      responseType: 'arrayBuffer'
    })

    const contentType = response.headers.get('content-type') || 'image/webp'
    const contentDisposition = response.headers.get('content-disposition')

    setResponseHeader(event, 'Content-Type', contentType)
    if (contentDisposition) {
      setResponseHeader(event, 'Content-Disposition', contentDisposition)
    }

    return send(event, Buffer.from(response._data as ArrayBuffer), contentType)
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to fetch document thumbnail from Paperless')
  }
})
