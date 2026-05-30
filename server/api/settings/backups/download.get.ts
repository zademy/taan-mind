import { z } from 'zod'
import { LOGICAL_BACKUP_MIME_TYPE } from '#shared/utils/backups'

const backupDownloadQuerySchema = z.object({
  includeShares: z
    .enum(['0', '1', 'false', 'true'])
    .optional()
    .transform(value => value !== '0' && value !== 'false')
})

/**
 * GET /api/settings/backups/download
 *
 * Builds a logical ZIP backup from app-owned data only. Better Auth tables are
 * excluded so credentials and sessions stay tied to the current deployment.
 */
export default defineEventHandler(async event => {
  await requireAdminSession(event)

  const query = await getValidatedQuery(event, backupDownloadQuerySchema.parse)
  const backup = await buildLogicalBackupZip({ includeShares: query.includeShares ?? true })
  const fileName = getLogicalBackupFileName()

  setResponseHeader(event, 'Content-Type', LOGICAL_BACKUP_MIME_TYPE)
  setResponseHeader(event, 'Content-Length', backup.length)
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return send(event, backup, LOGICAL_BACKUP_MIME_TYPE)
})
