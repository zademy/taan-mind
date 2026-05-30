import type { LogicalBackupStatus } from '#shared/utils/backups'

/**
 * GET /api/settings/backups/status
 *
 * Returns logical backup limits, included/excluded tables, and current row
 * counts. Auth tables are always excluded from backup/restore operations.
 */
export default defineEventHandler(async (event): Promise<LogicalBackupStatus> => {
  await requireAdminSession(event)
  return getLogicalBackupStatus()
})
