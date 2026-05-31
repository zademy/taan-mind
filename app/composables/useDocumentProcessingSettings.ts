/**
 * Document Processing Settings Composable
 *
 * Fetches the global AI enrichment model used by the background document
 * processor, and provides a typed update function to change it.
 *
 * The available model list is fetched from `/api/models?scope=document-processing`
 * with a static fallback so the UI always has options even before the API responds.
 *
 * @module app/composables
 */

import type {
  DocumentProcessingSettings,
  DocumentProcessingSettingsPayload,
  ModelsResponse
} from '#shared/utils/models'
import { DEFAULT_DOCUMENT_PROCESSING_MODEL, DOCUMENT_PROCESSING_MODELS } from '#shared/utils/models'

/**
 * Fetches and updates global Paperless document processing settings.
 *
 * The selected enrichment model is stored server-side because the background
 * processor runs outside a browser session.
 */
export function useDocumentProcessingSettings() {
  const { csrf, headerName } = useCsrf()

  /** Currently stored document processing settings, fetched from the server. */
  const {
    data: settings,
    refresh,
    status,
    error
  } = useFetch<DocumentProcessingSettings>('/api/settings/document-processing', {
    key: 'document-processing-settings',
    default: () => ({ enrichmentModel: DEFAULT_DOCUMENT_PROCESSING_MODEL })
  })

  /** Available models loaded lazily from the server, with a static fallback. */
  const {
    data: modelData,
    status: modelsStatus,
    error: modelsError,
    refresh: refreshModels
  } = useLazyFetch<ModelsResponse>('/api/models', {
    key: 'document-processing-models',
    query: { scope: 'document-processing' },
    default: () => ({ models: DOCUMENT_PROCESSING_MODELS })
  })

  /** Computed list of available models, falling back to static defaults when the API has not loaded yet. */
  const models = computed(() => {
    const availableModels = modelData.value?.models ?? []
    return availableModels.length > 0 ? availableModels : DOCUMENT_PROCESSING_MODELS
  })

  /**
   * Persists updated document processing settings to the server.
   *
   * Optimistically updates the local reactive state after the server confirms.
   *
   * @param body - The payload containing the new enrichment model selection.
   * @returns The updated settings from the server.
   */
  async function update(body: DocumentProcessingSettingsPayload) {
    const nextSettings = await $fetch<DocumentProcessingSettings>(
      '/api/settings/document-processing',
      {
        method: 'PATCH',
        headers: { [headerName]: csrf },
        body
      }
    )

    // Update local state to reflect the server response immediately
    settings.value = nextSettings
    return nextSettings
  }

  return {
    error,
    models,
    modelsError,
    modelsStatus,
    refresh,
    refreshModels,
    settings,
    status,
    update
  }
}
