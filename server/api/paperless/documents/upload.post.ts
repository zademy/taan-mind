/**
 * POST /api/paperless/documents/upload
 *
 * Uploads a document to Paperless.
 * Accepts multipart form data and forwards to POST /documents/post_document/.
 */
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No multipart form data provided'
    })
  }

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

  // Rebuild FormData for the upstream request
  const body = new FormData()

  for (const part of formData) {
    if (!part.name) continue

    if (part.filename) {
      const blob = new Blob([new Uint8Array(part.data)], { type: part.type || 'application/octet-stream' })
      body.append(part.name, blob, part.filename)
    } else {
      body.append(part.name, part.data.toString('utf-8'))
    }
  }

  try {
    const result = await $fetch(`${baseURL}/api/documents/post_document/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`
      },
      body
    })

    return result
  } catch (error: unknown) {
    const err = error as { statusCode?: number, statusMessage?: string }
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to upload document to Paperless'
    })
  }
})
