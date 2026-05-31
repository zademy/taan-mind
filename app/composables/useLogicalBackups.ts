/**
 * Logical Backups Composable
 *
 * Provides download and restore operations for logical ZIP backups.
 * Uses `$fetch` with CSRF headers for mutations and raw `fetch` with
 * `credentials: include` for the binary download response.
 *
 * Restore uploads are sent as `multipart/form-data` with a `backup` field.
 * Downloads rely on the existing authenticated session to stream a ZIP file.
 *
 * @module app/composables
 */

import type { LogicalBackupRestoreResult, LogicalBackupStatus } from '#shared/utils/backups'

interface DownloadLogicalBackupOptions {
  includeShares?: boolean
}

function getFileNameFromContentDisposition(value: string | null): string | null {
  if (!value) return null

  const match = value.match(/filename="([^"]+)"/i) || value.match(/filename=([^;]+)/i)
  return match?.[1]?.trim() || null
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Fetches backup status and performs logical ZIP backup/restore operations.
 *
 * Restore uploads are CSRF-protected. Downloads rely on the existing
 * authenticated browser session and return a generated ZIP file.
 */
export function useLogicalBackups() {
  const { csrf, headerName } = useCsrf()

  const {
    data: status,
    refresh,
    error,
    status: requestStatus
  } = useFetch<LogicalBackupStatus>('/api/settings/backups/status', {
    key: 'settings-logical-backup-status'
  })

  async function download(options: DownloadLogicalBackupOptions = {}) {
    const includeShares = options.includeShares ?? true
    const params = new URLSearchParams({
      includeShares: includeShares ? '1' : '0'
    })

    const response = await fetch(`/api/settings/backups/download?${params.toString()}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error((await response.text()) || 'Could not download backup')
    }

    const blob = await response.blob()
    const fileName =
      getFileNameFromContentDisposition(response.headers.get('content-disposition')) ||
      'taan-mind-logical-backup.zip'

    downloadBlob(blob, fileName)
    await refresh()
  }

  async function restore(file: File) {
    const body = new FormData()
    body.append('backup', file)

    const result = await $fetch<LogicalBackupRestoreResult>('/api/settings/backups/restore', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body
    })

    await refresh()
    return result
  }

  return {
    status,
    requestStatus,
    error,
    refresh,
    download,
    restore
  }
}
