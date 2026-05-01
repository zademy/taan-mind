import { z } from 'zod'

/**
 * GET /api/paperless/documents/:id/thumb
 *
 * Returns document thumbnail image.
 * Proxies binary response from Paperless.
 */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.coerce.number().int().positive()
  }).parse)

  const config = useRuntimeConfig(event)
  const baseURL = config.paperlessBaseUrl?.replace(/\/+$/, '')
  const token = config.paperlessApiToken

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_BASE_URL is not configured'
    })
  }

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PAPERLESS_API_TOKEN is not configured'
    })
  }

  try {
    const response = await $fetch.raw(`${baseURL}/api/documents/${id}/thumb/`, {
      headers: {
        Authorization: `Token ${token}`
      },
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
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch document thumbnail from Paperless'
    })
  }
})
