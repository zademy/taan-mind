import { Buffer } from 'node:buffer'
import {
  LOGICAL_BACKUP_FILE_EXTENSION,
  LOGICAL_BACKUP_MAX_UPLOAD_BYTES,
  type LogicalBackupRestoreResult
} from '#shared/utils/backups'

/**
 * POST /api/settings/backups/restore
 *
 * Restores a logical ZIP backup into the current deployment without importing
 * Better Auth users, accounts, sessions, or verification records. Every
 * user-owned row is reassigned to the currently authenticated admin.
 *
 * @module server/api/settings
 */
export default defineEventHandler(async (event): Promise<LogicalBackupRestoreResult> => {
  const admin = await requireAdminSession(event)
  const form = await readMultipartFormData(event)
  const backupPart = form?.find(part => part.name === 'backup' && part.filename)

  if (!backupPart?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup ZIP file is required'
    })
  }

  if (!backupPart.filename?.toLowerCase().endsWith(LOGICAL_BACKUP_FILE_EXTENSION)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup must be a .zip file'
    })
  }

  if (backupPart.data.length > LOGICAL_BACKUP_MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Backup file is too large'
    })
  }

  return restoreLogicalBackupZip(Buffer.from(backupPart.data), {
    ownerUserId: admin.user.id,
    ownerEmail: admin.user.email
  })
})
