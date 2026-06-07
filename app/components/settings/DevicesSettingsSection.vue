<!--
  DevicesSettingsSection.vue — Lists authenticated Better Auth device sessions
  and allows revoking individual or all other sessions.

  @section Current Device Protection
  The session used to make the current request (identified by matching
  session ID) is marked "Current" and cannot be deleted from this UI.
  "Delete others" revokes every other session for the signed-in user but
  preserves the active one.

  @section Session Lifecycle
  Sessions are created on sign-in and refreshed every 24 hours while active.
  The "last active" timestamp is derived from Better Auth's `updatedAt` field,
  which reflects refresh events, not raw request activity.

  @composable useDeviceSessions — fetches and revokes sessions via the settings API.
-->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DeviceSession } from '#shared/utils/deviceSessions'

const toast = useToast()

const { devices, refresh, status, remove, removeOthers } = useDeviceSessions()

const deletingId = shallowRef<string | null>(null)
const deletingOthers = shallowRef(false)

const otherDeviceCount = computed(
  () => devices.value?.filter(device => !device.isCurrent).length ?? 0
)

const columns: TableColumn<DeviceSession>[] = [
  {
    accessorKey: 'lastActiveAt',
    header: 'Last active',
    enableSorting: true,
    meta: {
      class: {
        th: 'min-w-40',
        td: 'min-w-40'
      }
    }
  },
  {
    accessorKey: 'deviceName',
    header: 'Device',
    enableSorting: true,
    meta: {
      class: {
        th: 'min-w-56',
        td: 'min-w-56'
      }
    }
  },
  {
    accessorKey: 'applicationName',
    header: 'Application name',
    enableSorting: true,
    meta: {
      class: {
        th: 'min-w-44',
        td: 'min-w-44'
      }
    }
  },
  {
    accessorKey: 'userLabel',
    header: 'User',
    enableSorting: true,
    meta: {
      class: {
        th: 'min-w-44',
        td: 'min-w-44'
      }
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-24 text-right',
        td: 'w-24 text-right'
      }
    }
  }
]

/** Formats an ISO timestamp as a localized "Mon DD, YYYY HH:mm" string, or em-dash on invalid input. */
function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

/** Extracts a user-safe error message from an H3/$fetch error, falling back to a generic string. */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data
    return data?.statusMessage || data?.message || 'Could not update devices'
  }

  return 'Could not update devices'
}

/** Revokes a single non-current device session and shows the resulting toast feedback. */
async function deleteDevice(device: DeviceSession) {
  if (device.isCurrent) return

  deletingId.value = device.id
  try {
    await remove(device.id)
    toast.add({
      title: 'Device session deleted',
      icon: 'i-lucide-trash'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingId.value = null
  }
}

/** Revokes every device session except the current one and reports how many were removed. */
async function deleteOtherDevices() {
  if (otherDeviceCount.value === 0) return

  deletingOthers.value = true
  try {
    const result = await removeOthers()
    toast.add({
      title: 'Other devices deleted',
      description: `${result.deletedCount} session${result.deletedCount === 1 ? '' : 's'} revoked`,
      icon: 'i-lucide-trash'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingOthers.value = false
  }
}
</script>

<template>
  <section class="space-y-4">
    <div
      class="flex flex-col gap-3 rounded-2xl border border-default bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 class="text-sm font-semibold text-highlighted">Devices</h3>
        <p class="mt-1 text-xs text-muted">
          Review active sign-in sessions and revoke devices you no longer use.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          label="Refresh"
          :loading="status === 'pending'"
          @click="refresh()"
        />
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          label="Delete others"
          :loading="deletingOthers"
          :disabled="otherDeviceCount === 0"
          @click="deleteOtherDevices"
        />
      </div>
    </div>

    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="Current device is protected"
      description="Deleting all devices keeps this session active so you do not get signed out accidentally."
    />

    <div class="overflow-hidden rounded-2xl border border-default">
      <UTable
        :data="devices ?? []"
        :columns="columns"
        :loading="status === 'pending'"
        :sticky="true"
        :sorting-options="{ manualSorting: false }"
        empty="No active device sessions found."
        class="max-h-[28rem] w-full"
      >
        <template #lastActiveAt-cell="{ row }">
          <span class="text-sm text-default">{{ formatDate(row.original.lastActiveAt) }}</span>
        </template>

        <template #deviceName-cell="{ row }">
          <div class="flex items-center gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-elevated text-muted ring ring-default"
            >
              <UIcon :name="row.original.deviceIcon" class="size-4" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-highlighted">
                {{ row.original.deviceName }}
              </span>
              <span class="block truncate text-xs text-muted">
                {{ row.original.deviceDescription }}
              </span>
            </span>
          </div>
        </template>

        <template #applicationName-cell="{ row }">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-default">{{ row.original.applicationName }}</span>
            <span class="text-xs text-muted">{{ row.original.browserName }}</span>
          </div>
        </template>

        <template #userLabel-cell="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted ring ring-default"
            >
              <UIcon name="i-lucide-user" class="size-4" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm text-highlighted">
                {{ row.original.userLabel }}
              </span>
              <span v-if="row.original.userEmail" class="block truncate text-xs text-muted">
                {{ row.original.userEmail }}
              </span>
            </span>
          </div>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UBadge v-if="row.original.isCurrent" color="neutral" variant="soft" label="Current" />
            <UButton
              v-else
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              aria-label="Delete device session"
              :loading="deletingId === row.original.id"
              @click="deleteDevice(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>
  </section>
</template>
