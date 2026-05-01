/**
 * Composable that checks the health status of the OCR service (Ollama).
 *
 * Uses `useLazyFetch` so the request does not block navigation.
 *
 * @returns A `useLazyFetch` result with the OCR health status.
 */
export function useOcrHealth() {
  return useLazyFetch<OcrHealthResponse>('/api/ocr/health')
}

/**
 * Composable that fetches the list of available OCR models from Ollama.
 *
 * Uses `useLazyFetch` so the request does not block navigation.
 *
 * @returns A `useLazyFetch` result with the available OCR models.
 */
export function useOcrModels() {
  return useLazyFetch<OcrModelsResponse>('/api/ocr/models')
}

/**
 * Composable that provides a helper to upload a file for OCR extraction.
 *
 * Automatically includes the CSRF token header required by the API.
 *
 * @returns An object with the `extract` async function.
 */
export function useOcrExtract() {
  const { csrf, headerName } = useCsrf()

  /**
   * Uploads a file to the OCR extraction endpoint.
   *
   * @param file - The file to process (PDF, image, Office document, etc.).
   * @returns The OCR extraction result including extracted pages and method used.
   */
  async function extract(file: File): Promise<OcrExtractResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return $fetch<OcrExtractResponse>('/api/ocr/extract', {
      method: 'POST',
      body: formData,
      headers: { [headerName]: csrf }
    })
  }

  return { extract }
}
