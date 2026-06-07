<!--
  BackupRestoreSettingsSection.vue — Logical ZIP backup/restore for app data.

  Auth tables are intentionally excluded. Restore remaps every user-owned
  record to the currently signed-in admin so credentials from the current
  environment remain untouched.
-->
<script setup lang="ts">
import { LOGICAL_BACKUP_MAX_UPLOAD_BYTES } from '#shared/utils/backups'

const CONFIRM_RESTORE_TEXT = 'RESTORE'

const toast = useToast()
const { status: backupStatus, requestStatus, download, restore, refresh } = useLogicalBackups()

const includeShares = shallowRef(true)
const restoreFile = shallowRef<File | null>(null)
const restoreConfirmation = shallowRef('')
const downloading = shallowRef(false)
const restoring = shallowRef(false)

const canRestore = computed(
  () =>
    Boolean(restoreFile.value) &&
    restoreConfirmation.value === CONFIRM_RESTORE_TEXT &&
    !restoring.value
)

const appDataCount = computed(() => {
  const counts = backupStatus.value?.counts
  if (!counts) return 0

  return (
    counts.projects +
    counts.chats +
    counts.messages +
    counts.custom_personalities +
    counts.app_settings +
    counts.paperless_documents +
    counts.chat_documents +
    counts.chat_shares
  )
})

/** Converts a raw byte count into a compact human-readable size (B / KB / MB). */
function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

/** Extracts a user-safe error message from any thrown value, falling back to a generic string. */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message

  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data
    return data?.statusMessage || data?.message || 'Backup operation failed'
  }

  return 'Backup operation failed'
}

/** Triggers a logical ZIP download of the app data (excluding auth tables) with the user's share-link preference. */
async function downloadBackup() {
  downloading.value = true

  try {
    await download({ includeShares: includeShares.value })
    toast.add({
      title: 'Backup downloaded',
      description: 'Logical ZIP backup created without auth tables',
      icon: 'i-lucide-download'
    })
  } catch (error) {
    toast.add({
      title: 'Download failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    downloading.value = false
  }
}

/** Uploads the selected logical ZIP to the restore endpoint and reports the resulting row counts via toast. */
async function restoreBackup() {
  if (!restoreFile.value || !canRestore.value) return

  restoring.value = true

  try {
    const result = await restore(restoreFile.value)
    restoreFile.value = null
    restoreConfirmation.value = ''

    toast.add({
      title: 'Backup restored',
      description: `${result.counts.chats} chats restored for ${result.ownerEmail}. Safety backup: ${result.safetyBackupFileName}`,
      icon: 'i-lucide-rotate-ccw'
    })
  } catch (error) {
    toast.add({
      title: 'Restore failed',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    restoring.value = false
  }
}
</script>

<template>
  <section class="space-y-4">
    <div
      class="flex flex-col gap-3 rounded-2xl border border-default bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 class="text-sm font-semibold text-highlighted">Backup & restore</h3>
        <p class="mt-1 text-xs text-muted">
          Export and restore app data as a logical ZIP without users, passwords, or sessions.
        </p>
      </div>

      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        label="Refresh"
        :loading="requestStatus === 'pending'"
        @click="refresh()"
      />
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Credentials stay local"
      description="Restore skips Better Auth tables and assigns restored app data to the currently signed-in admin."
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-2xl border border-default bg-elevated/40 p-4">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-highlighted">Create backup</h4>
            <p class="mt-1 text-xs text-muted">
              Downloads a ZIP containing projects, chats, messages, settings, and Paperless cache.
            </p>
          </div>
          <UBadge color="neutral" variant="soft"> {{ appDataCount }} rows </UBadge>
        </div>

        <div class="space-y-3">
          <UCheckbox
            v-model="includeShares"
            label="Include shared chat links"
            description="Preserves public share tokens. Disable this if you want restored chats to start private."
          />

          <UButton
            icon="i-lucide-download"
            label="Download logical ZIP"
            :loading="downloading"
            :disabled="requestStatus === 'pending'"
            @click="downloadBackup"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-default bg-elevated/40 p-4">
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-highlighted">Restore backup</h4>
          <p class="mt-1 text-xs text-muted">
            Replaces current app data. Auth users, credentials, and sessions are not modified.
          </p>
        </div>

        <div class="space-y-4">
          <UFileUpload
            v-model="restoreFile"
            accept=".zip,application/zip"
            variant="area"
            layout="list"
            label="Drop logical backup ZIP here"
            :description="`Maximum size: ${formatBytes(LOGICAL_BACKUP_MAX_UPLOAD_BYTES)}`"
            icon="i-lucide-file-archive"
            class="w-full"
            :disabled="restoring"
            :file-image="false"
          />

          <UFormField
            label="Confirmation"
            description='Type "RESTORE" to replace current app data.'
          >
            <UInput
              v-model="restoreConfirmation"
              placeholder="RESTORE"
              :disabled="restoring"
              autocomplete="off"
            />
          </UFormField>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Restore replaces app data"
            description="Current chats, projects, settings, document cache, personalities, and share links will be replaced by the backup."
          />

          <UButton
            color="warning"
            icon="i-lucide-rotate-ccw"
            label="Restore logical ZIP"
            :loading="restoring"
            :disabled="!canRestore"
            @click="restoreBackup"
          />
        </div>
      </section>
    </div>
  </section>
</template>
