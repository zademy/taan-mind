<!--
  DocumentProcessingSettingsSection.vue — Settings section for the AI model
  used by the background OCR metadata pipeline.

  @section Enrichment Model
  After OCR finishes, the document processor runs a second AI step:
  content formatting and metadata extraction. This setting controls which
  AI model handles that step for all new processing jobs.

  @section Availability Check
  The select menu only lists models currently available in
  {@link useDocumentProcessingSettings.models}. If the saved setting points to
  a model no longer available (e.g. a key was revoked) a warning alert is shown
  and saving is blocked until a valid model is selected.

  @important Changing this setting does NOT re-process existing documents.
  It only applies to new background jobs queued after the save.

  @composable useDocumentProcessingSettings — fetches available models and
  persists the selected enrichment model to the app_settings DB table.
-->
<script setup lang="ts">
import type { ModelId } from '#shared/utils/models'
import { DEFAULT_DOCUMENT_PROCESSING_MODEL } from '#shared/utils/models'

const toast = useToast()

const {
  models: processingModels,
  settings: processingSettings,
  status: processingStatus,
  modelsStatus: processingModelsStatus,
  update: updateProcessingSettings
} = useDocumentProcessingSettings()

const processingModel = shallowRef<ModelId>(DEFAULT_DOCUMENT_PROCESSING_MODEL)
const savingProcessingSettings = shallowRef(false)

const currentProcessingModel = computed(
  () => processingSettings.value?.enrichmentModel ?? DEFAULT_DOCUMENT_PROCESSING_MODEL
)
const selectedProcessingModel = computed(() =>
  processingModels.value.find(option => option.value === processingModel.value)
)
const processingModelIsAvailable = computed(() =>
  processingModels.value.some(option => option.value === processingModel.value)
)
const canSaveProcessingSettings = computed(
  () =>
    !savingProcessingSettings.value &&
    processingModelIsAvailable.value &&
    processingModel.value !== currentProcessingModel.value
)

watch(
  currentProcessingModel,
  value => {
    processingModel.value = value
  },
  { immediate: true }
)

/** Extracts a user-safe error message from an H3/$fetch error, falling back to a generic string. */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data
    return data?.statusMessage || data?.message || 'Could not save settings'
  }

  return 'Could not save settings'
}

/** Persists the selected enrichment model to the app_settings table for the document processing pipeline. */
async function saveProcessingSettings() {
  if (!canSaveProcessingSettings.value) return

  savingProcessingSettings.value = true
  try {
    await updateProcessingSettings({ enrichmentModel: processingModel.value })
    toast.add({
      title: 'Processing model updated',
      description: 'New documents will use the selected model after OCR',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingProcessingSettings.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border border-default bg-elevated/40 p-4">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">Document processing</h3>
        <p class="mt-1 text-xs text-muted">
          Choose the model used after OCR to format content and suggest Paperless metadata.
        </p>
      </div>
      <UBadge color="neutral" variant="soft">
        {{ selectedProcessingModel?.label ?? currentProcessingModel }}
      </UBadge>
    </div>

    <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <UFormField
        label="Enrichment model"
        description="Applies to new background processing runs. OCR model selection is unchanged."
        class="w-full"
      >
        <USelectMenu
          v-model="processingModel"
          :items="processingModels"
          value-key="value"
          icon="i-lucide-brain-circuit"
          :disabled="
            savingProcessingSettings ||
            processingStatus === 'pending' ||
            processingModelsStatus === 'pending'
          "
          class="w-full"
        />
      </UFormField>

      <UButton
        label="Save model"
        icon="i-lucide-save"
        :loading="savingProcessingSettings"
        :disabled="!canSaveProcessingSettings"
        @click="saveProcessingSettings"
      />
    </div>

    <UAlert
      v-if="!processingModelIsAvailable"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Model unavailable"
      description="Pick one of the currently available models before saving."
      class="mt-4"
    />
  </section>
</template>
