/**
 * Logical backup contracts shared by the settings UI and Nitro endpoints.
 *
 * Backups intentionally exclude Better Auth tables so credentials, sessions,
 * and environment-driven bootstrap behavior remain local to each deployment.
 */

export const LOGICAL_BACKUP_FORMAT_VERSION = 1
export const LOGICAL_BACKUP_JSON_NAME = 'taan-mind-backup.json'
export const LOGICAL_BACKUP_MIME_TYPE = 'application/zip'
export const LOGICAL_BACKUP_FILE_EXTENSION = '.zip'
export const LOGICAL_BACKUP_MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export const LOGICAL_BACKUP_INCLUDED_TABLES = [
  'projects',
  'chats',
  'messages',
  'custom_personalities',
  'app_settings',
  'paperless_documents',
  'chat_documents',
  'chat_shares'
] as const

export const LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES = [
  'user',
  'account',
  'session',
  'verification'
] as const

export type LogicalBackupIncludedTable = (typeof LOGICAL_BACKUP_INCLUDED_TABLES)[number]
export type LogicalBackupExcludedAuthTable = (typeof LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES)[number]

export type LogicalBackupCounts = Record<LogicalBackupIncludedTable, number>

export interface LogicalBackupStatus {
  formatVersion: typeof LOGICAL_BACKUP_FORMAT_VERSION
  maxUploadBytes: number
  includedTables: LogicalBackupIncludedTable[]
  excludedAuthTables: LogicalBackupExcludedAuthTable[]
  counts: LogicalBackupCounts
}

export interface LogicalBackupRestoreResult {
  ok: true
  restoredAt: string
  ownerEmail: string
  safetyBackupFileName: string
  counts: LogicalBackupCounts
  authTablesSkipped: LogicalBackupExcludedAuthTable[]
}
