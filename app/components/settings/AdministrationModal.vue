<!--
  AdministrationModal.vue — Settings shell with focused tabs:
  Document Processing, Backup & Restore, Personalities, and Devices.

  @section Layout
  Renders a scrollable UModal at max-width "sm:max-w-5xl". Tab content
  is conditionally rendered with v-show so the tab panels stay mounted and
  preserve state when switching.

  @section Tabs
  - Document Processing — enrichment model selection for the background OCR pipeline.
  - Backup & Restore — logical ZIP export/import without auth credentials.
  - Personalities — create, edit, and delete custom AI personalities (max 3).
  - Devices — view and revoke active Better Auth sessions.

  @emits close — emits when the user clicks "Close" in the modal footer.
-->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const emit = defineEmits<{ close: [] }>()

const activeTab = shallowRef('document-processing')

const tabs: TabsItem[] = [
  {
    label: 'Document processing',
    icon: 'i-lucide-file-cog',
    value: 'document-processing'
  },
  {
    label: 'Backup & restore',
    icon: 'i-lucide-archive-restore',
    value: 'backup-restore'
  },
  {
    label: 'Personalities',
    icon: 'i-lucide-sparkles',
    value: 'personalities'
  },
  {
    label: 'Devices',
    icon: 'i-lucide-monitor-smartphone',
    value: 'devices'
  }
]
</script>

<template>
  <UModal
    title="Settings"
    description="Configure document processing, backup and restore, chat personalization, and signed-in devices."
    scrollable
    :ui="{
      content: 'sm:max-w-5xl',
      footer: 'justify-end'
    }"
  >
    <template #body>
      <div class="space-y-5">
        <UTabs
          v-model="activeTab"
          :content="false"
          :items="tabs"
          color="neutral"
          variant="link"
          class="w-full"
        />

        <SettingsDocumentProcessingSettingsSection v-show="activeTab === 'document-processing'" />
        <SettingsBackupRestoreSettingsSection v-show="activeTab === 'backup-restore'" />
        <SettingsCustomPersonalitiesSettingsSection v-show="activeTab === 'personalities'" />
        <SettingsDevicesSettingsSection v-show="activeTab === 'devices'" />
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" label="Close" @click="emit('close')" />
    </template>
  </UModal>
</template>
