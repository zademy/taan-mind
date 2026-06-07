/**
 * Logical backup contracts shared by the settings UI and Nitro endpoints.
 *
 * Backups intentionally exclude Better Auth tables so credentials, sessions,
 * and environment-driven bootstrap behavior remain local to each deployment.
 */

/** Schema version embedded in every backup payload (bumped on breaking changes). */
export const LOGICAL_BACKUP_FORMAT_VERSION = 1
/** Name of the JSON entry stored inside the backup ZIP archive. */
export const LOGICAL_BACKUP_JSON_NAME = 'taan-mind-backup.json'
/** MIME type advertised by the download endpoint and accepted on restore. */
export const LOGICAL_BACKUP_MIME_TYPE = 'application/zip'
/** File extension used for backup downloads and suggested for user-saved files. */
export const LOGICAL_BACKUP_FILE_EXTENSION = '.zip'
/** Maximum accepted upload size for restore operations (100 MB). */
export const LOGICAL_BACKUP_MAX_UPLOAD_BYTES = 100 * 1024 * 1024

/**
 * Application tables persisted into a logical backup.
 *
 * Order matches the dependency graph used during restore (parents before children).
 */
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

/**
 * Better Auth tables that are intentionally excluded from logical backups.
 *
 * Each deployment owns its own credentials, sessions, and verification tokens
 * so restoring another tenant's auth data would break local sign-in.
 */
export const LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES = [
  'user',
  'account',
  'session',
  'verification'
] as const

/** Union of table names persisted into a logical backup. */
export type LogicalBackupIncludedTable = (typeof LOGICAL_BACKUP_INCLUDED_TABLES)[number]
/** Union of Better Auth table names excluded from logical backups. */
export type LogicalBackupExcludedAuthTable = (typeof LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES)[number]

/** Row counts per included table, returned in status and restore responses. */
export type LogicalBackupCounts = Record<LogicalBackupIncludedTable, number>

/**
 * Status payload returned by `GET /api/settings/backups/status`.
 *
 * Gives the UI the current schema version, upload limits, and live row
 * counts so users can see what a backup would contain before downloading.
 */
export interface LogicalBackupStatus {
  formatVersion: typeof LOGICAL_BACKUP_FORMAT_VERSION
  maxUploadBytes: number
  includedTables: LogicalBackupIncludedTable[]
  excludedAuthTables: LogicalBackupExcludedAuthTable[]
  counts: LogicalBackupCounts
}

/**
 * Result payload returned by `POST /api/settings/backups/restore`.
 *
 * Reports the new owner, when the restore happened, the safety backup file
 * that was created beforehand, and how many rows were written per table.
 */
export interface LogicalBackupRestoreResult {
  ok: true
  restoredAt: string
  ownerEmail: string
  safetyBackupFileName: string
  counts: LogicalBackupCounts
  authTablesSkipped: LogicalBackupExcludedAuthTable[]
}
