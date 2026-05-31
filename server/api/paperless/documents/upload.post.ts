/**
 * POST /api/paperless/documents/upload
 *
 * Uploads a document to Paperless.
 * Accepts multipart form data and forwards to POST /documents/post_document/.
 */
export default defineEventHandler(async event => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No multipart form data provided'
    })
  }

  const { apiBaseUrl, authHeaders } = getPaperlessConfig(event)

  // Rebuild FormData for the upstream request
  const body = new FormData()

  for (const part of formData) {
    if (!part.name) continue

    if (part.filename) {
      const blob = new Blob([new Uint8Array(part.data)], {
        type: part.type || 'application/octet-stream'
      })
      body.append(part.name, blob, part.filename)
    } else {
      body.append(part.name, part.data.toString('utf-8'))
    }
  }

  try {
    const result = await $fetch(`${apiBaseUrl}/documents/post_document/`, {
      method: 'POST',
      headers: authHeaders,
      body
    })

    return result
  } catch (error: unknown) {
    handlePaperlessError(error, 'Failed to upload document to Paperless')
  }
})
