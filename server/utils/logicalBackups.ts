import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { count } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from 'hub:db'
import {
  LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES,
  LOGICAL_BACKUP_FORMAT_VERSION,
  LOGICAL_BACKUP_INCLUDED_TABLES,
  LOGICAL_BACKUP_JSON_NAME,
  LOGICAL_BACKUP_MAX_UPLOAD_BYTES,
  type LogicalBackupCounts,
  type LogicalBackupStatus
} from '#shared/utils/backups'

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const ZIP_COMPRESSION_STORE = 0
const ZIP_COMPRESSION_DEFLATE = 8
const ZIP_UTF8_FLAG = 0x0800
const PRE_RESTORE_BACKUP_DIR =
  process.env.NUXT_LOGICAL_BACKUP_DIR ||
  process.env.LOGICAL_BACKUP_DIR ||
  join(process.cwd(), '.data', 'backups')

const isoDateSchema = z.string().datetime()
const nullableIsoDateSchema = isoDateSchema.nullable()

const projectBackupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDateSchema
})

const chatBackupSchema = z.object({
  id: z.string().min(1),
  title: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  personality: z.string().min(1),
  projectId: z.string().nullable(),
  documentId: z.number().int().nullable(),
  createdAt: isoDateSchema
})

const messageBackupSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.unknown().nullable(),
  createdAt: isoDateSchema
})

const chatShareBackupSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),
  chatId: z.string().min(1),
  mode: z.enum(['live']),
  active: z.boolean(),
  expiresAt: nullableIsoDateSchema,
  revokedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema
})

const customPersonalityBackupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema
})

const appSettingBackupSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema
})

const paperlessDocumentBackupSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  correspondent: z.number().int().nullable(),
  documentType: z.number().int().nullable(),
  storagePath: z.number().int().nullable(),
  originalFileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  ocrContent: z.string().nullable(),
  aiContent: z.string().nullable(),
  ocrMethod: z.string().nullable(),
  processingModel: z.string().nullable(),
  processed: z.number().int(),
  processingStartedAt: nullableIsoDateSchema,
  processingCompletedAt: nullableIsoDateSchema,
  paperlessCreated: nullableIsoDateSchema,
  paperlessModified: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  deletedAt: nullableIsoDateSchema
})

const chatDocumentBackupSchema = z.object({
  chatId: z.string().min(1),
  documentId: z.number().int().positive(),
  position: z.number().int(),
  createdAt: isoDateSchema
})

const logicalBackupPayloadSchema = z.object({
  formatVersion: z.literal(LOGICAL_BACKUP_FORMAT_VERSION),
  createdAt: isoDateSchema,
  app: z.literal('taan-mind'),
  ownership: z.literal('remap-to-current-admin-on-restore'),
  excludedAuthTables: z.array(z.enum(LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES)),
  data: z.object({
    projects: z.array(projectBackupSchema),
    chats: z.array(chatBackupSchema),
    messages: z.array(messageBackupSchema),
    customPersonalities: z.array(customPersonalityBackupSchema),
    appSettings: z.array(appSettingBackupSchema),
    paperlessDocuments: z.array(paperlessDocumentBackupSchema),
    chatDocuments: z.array(chatDocumentBackupSchema),
    chatShares: z.array(chatShareBackupSchema).default([])
  })
})

type LogicalBackupPayload = z.output<typeof logicalBackupPayloadSchema>

let restoreInProgress = false

interface BuildLogicalBackupOptions {
  includeShares: boolean
}

interface RestoreLogicalBackupOptions {
  ownerUserId: string
  ownerEmail: string
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function toDate(value: string): Date {
  return new Date(value)
}

function toNullableDate(value: string | null): Date | null {
  return value ? new Date(value) : null
}

function getDosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980)

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

function makeCrc32Table() {
  const table = new Uint32Array(256)

  for (let i = 0; i < table.length; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[i] = value >>> 0
  }

  return table
}

const crc32Table = makeCrc32Table()

function crc32(data: Buffer): number {
  let value = 0xffffffff

  for (const byte of data) {
    value = crc32Table[(value ^ byte) & 0xff]! ^ (value >>> 8)
  }

  return (value ^ 0xffffffff) >>> 0
}

function createZipArchive(fileName: string, content: Buffer): Buffer {
  const fileNameBuffer = Buffer.from(fileName, 'utf8')
  const compressed = deflateRawSync(content, { level: 9 })
  const checksum = crc32(content)
  const modified = getDosDateTime(new Date())

  const localHeader = Buffer.alloc(30)
  localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0)
  localHeader.writeUInt16LE(20, 4)
  localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6)
  localHeader.writeUInt16LE(ZIP_COMPRESSION_DEFLATE, 8)
  localHeader.writeUInt16LE(modified.time, 10)
  localHeader.writeUInt16LE(modified.date, 12)
  localHeader.writeUInt32LE(checksum, 14)
  localHeader.writeUInt32LE(compressed.length, 18)
  localHeader.writeUInt32LE(content.length, 22)
  localHeader.writeUInt16LE(fileNameBuffer.length, 26)

  const localFileOffset = 0
  const centralDirectoryOffset = localHeader.length + fileNameBuffer.length + compressed.length
  const centralHeader = Buffer.alloc(46)
  centralHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_SIGNATURE, 0)
  centralHeader.writeUInt16LE(20, 4)
  centralHeader.writeUInt16LE(20, 6)
  centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8)
  centralHeader.writeUInt16LE(ZIP_COMPRESSION_DEFLATE, 10)
  centralHeader.writeUInt16LE(modified.time, 12)
  centralHeader.writeUInt16LE(modified.date, 14)
  centralHeader.writeUInt32LE(checksum, 16)
  centralHeader.writeUInt32LE(compressed.length, 20)
  centralHeader.writeUInt32LE(content.length, 24)
  centralHeader.writeUInt16LE(fileNameBuffer.length, 28)
  centralHeader.writeUInt32LE(localFileOffset, 42)

  const centralDirectorySize = centralHeader.length + fileNameBuffer.length
  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0)
  endOfCentralDirectory.writeUInt16LE(1, 8)
  endOfCentralDirectory.writeUInt16LE(1, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12)
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16)

  return Buffer.concat([
    localHeader,
    fileNameBuffer,
    compressed,
    centralHeader,
    fileNameBuffer,
    endOfCentralDirectory
  ])
}

function findEndOfCentralDirectory(zip: Buffer): number {
  const minOffset = Math.max(0, zip.length - 65_557)

  for (let offset = zip.length - 22; offset >= minOffset; offset -= 1) {
    if (zip.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }

  throw new Error('Invalid ZIP: end of central directory not found')
}

function extractFileFromZip(zip: Buffer, fileName: string): Buffer {
  const endOffset = findEndOfCentralDirectory(zip)
  const entryCount = zip.readUInt16LE(endOffset + 10)
  const centralDirectoryOffset = zip.readUInt32LE(endOffset + 16)
  let entryOffset = centralDirectoryOffset

  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(entryOffset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Invalid ZIP: central directory is corrupt')
    }

    const compressionMethod = zip.readUInt16LE(entryOffset + 10)
    const expectedCrc = zip.readUInt32LE(entryOffset + 16)
    const compressedSize = zip.readUInt32LE(entryOffset + 20)
    const uncompressedSize = zip.readUInt32LE(entryOffset + 24)
    const entryNameLength = zip.readUInt16LE(entryOffset + 28)
    const extraLength = zip.readUInt16LE(entryOffset + 30)
    const commentLength = zip.readUInt16LE(entryOffset + 32)
    const localHeaderOffset = zip.readUInt32LE(entryOffset + 42)
    const entryName = zip
      .subarray(entryOffset + 46, entryOffset + 46 + entryNameLength)
      .toString('utf8')

    if (entryName === fileName) {
      if (zip.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
        throw new Error('Invalid ZIP: local file header is corrupt')
      }

      const localNameLength = zip.readUInt16LE(localHeaderOffset + 26)
      const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28)
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
      if (uncompressedSize > LOGICAL_BACKUP_MAX_UPLOAD_BYTES) {
        throw new Error('Invalid ZIP: backup JSON is too large')
      }
      if (dataOffset + compressedSize > zip.length) {
        throw new Error('Invalid ZIP: compressed data is corrupt')
      }

      const compressedData = zip.subarray(dataOffset, dataOffset + compressedSize)
      if (
        compressionMethod !== ZIP_COMPRESSION_STORE &&
        compressionMethod !== ZIP_COMPRESSION_DEFLATE
      ) {
        throw new Error('Unsupported ZIP compression method')
      }

      const content =
        compressionMethod === ZIP_COMPRESSION_STORE
          ? compressedData
          : inflateRawSync(compressedData)

      if (content.length !== uncompressedSize || crc32(content) !== expectedCrc) {
        throw new Error('Invalid ZIP: backup checksum mismatch')
      }

      return content
    }

    entryOffset += 46 + entryNameLength + extraLength + commentLength
  }

  throw new Error(`Invalid ZIP: ${fileName} not found`)
}

function parseLogicalBackupPayload(buffer: Buffer): LogicalBackupPayload {
  const jsonBuffer = extractFileFromZip(buffer, LOGICAL_BACKUP_JSON_NAME)
  const parsed = JSON.parse(jsonBuffer.toString('utf8')) as unknown
  return logicalBackupPayloadSchema.parse(parsed)
}

export async function getLogicalBackupStatus(): Promise<LogicalBackupStatus> {
  const [projects] = await db.select({ value: count() }).from(schema.projects)
  const [chats] = await db.select({ value: count() }).from(schema.chats)
  const [messages] = await db.select({ value: count() }).from(schema.messages)
  const [customPersonalities] = await db.select({ value: count() }).from(schema.customPersonalities)
  const [appSettings] = await db.select({ value: count() }).from(schema.appSettings)
  const [paperlessDocuments] = await db.select({ value: count() }).from(schema.paperlessDocuments)
  const [chatDocuments] = await db.select({ value: count() }).from(schema.chatDocuments)
  const [chatShares] = await db.select({ value: count() }).from(schema.chatShares)

  const counts: LogicalBackupCounts = {
    projects: Number(projects?.value ?? 0),
    chats: Number(chats?.value ?? 0),
    messages: Number(messages?.value ?? 0),
    custom_personalities: Number(customPersonalities?.value ?? 0),
    app_settings: Number(appSettings?.value ?? 0),
    paperless_documents: Number(paperlessDocuments?.value ?? 0),
    chat_documents: Number(chatDocuments?.value ?? 0),
    chat_shares: Number(chatShares?.value ?? 0)
  }

  return {
    formatVersion: LOGICAL_BACKUP_FORMAT_VERSION,
    maxUploadBytes: LOGICAL_BACKUP_MAX_UPLOAD_BYTES,
    includedTables: [...LOGICAL_BACKUP_INCLUDED_TABLES],
    excludedAuthTables: [...LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES],
    counts
  }
}

export async function buildLogicalBackupZip(options: BuildLogicalBackupOptions): Promise<Buffer> {
  const [
    projects,
    chats,
    messages,
    customPersonalities,
    appSettings,
    paperlessDocuments,
    chatDocuments,
    chatShares
  ] = await Promise.all([
    db.select().from(schema.projects),
    db.select().from(schema.chats),
    db.select().from(schema.messages),
    db.select().from(schema.customPersonalities),
    db.select().from(schema.appSettings),
    db.select().from(schema.paperlessDocuments),
    db.select().from(schema.chatDocuments),
    options.includeShares ? db.select().from(schema.chatShares) : Promise.resolve([])
  ])

  const payload: LogicalBackupPayload = {
    formatVersion: LOGICAL_BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    app: 'taan-mind',
    ownership: 'remap-to-current-admin-on-restore',
    excludedAuthTables: [...LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES],
    data: {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        createdAt: toIso(project.createdAt)!
      })),
      chats: chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        visibility: chat.visibility,
        personality: chat.personality,
        projectId: chat.projectId,
        documentId: chat.documentId,
        createdAt: toIso(chat.createdAt)!
      })),
      messages: messages.map(message => ({
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        parts: message.parts ?? null,
        createdAt: toIso(message.createdAt)!
      })),
      customPersonalities: customPersonalities.map(personality => ({
        id: personality.id,
        label: personality.label,
        prompt: personality.prompt,
        createdAt: toIso(personality.createdAt)!,
        updatedAt: toIso(personality.updatedAt)!
      })),
      appSettings: appSettings.map(setting => ({
        key: setting.key,
        value: setting.value,
        createdAt: toIso(setting.createdAt)!,
        updatedAt: toIso(setting.updatedAt)!
      })),
      paperlessDocuments: paperlessDocuments.map(document => ({
        id: document.id,
        title: document.title,
        correspondent: document.correspondent,
        documentType: document.documentType,
        storagePath: document.storagePath,
        originalFileName: document.originalFileName,
        mimeType: document.mimeType,
        pageCount: document.pageCount,
        ocrContent: document.ocrContent,
        aiContent: document.aiContent,
        ocrMethod: document.ocrMethod,
        processingModel: document.processingModel,
        processed: document.processed,
        processingStartedAt: toIso(document.processingStartedAt),
        processingCompletedAt: toIso(document.processingCompletedAt),
        paperlessCreated: toIso(document.paperlessCreated),
        paperlessModified: toIso(document.paperlessModified),
        createdAt: toIso(document.createdAt)!,
        updatedAt: toIso(document.updatedAt)!,
        deletedAt: toIso(document.deletedAt)
      })),
      chatDocuments: chatDocuments.map(document => ({
        chatId: document.chatId,
        documentId: document.documentId,
        position: document.position,
        createdAt: toIso(document.createdAt)!
      })),
      chatShares: chatShares.map(share => ({
        id: share.id,
        token: share.token,
        chatId: share.chatId,
        mode: share.mode,
        active: share.active,
        expiresAt: toIso(share.expiresAt),
        revokedAt: toIso(share.revokedAt),
        createdAt: toIso(share.createdAt)!
      }))
    }
  }

  const json = JSON.stringify(payload, null, 2)
  return createZipArchive(LOGICAL_BACKUP_JSON_NAME, Buffer.from(json, 'utf8'))
}

async function savePreRestoreBackup(): Promise<string> {
  const backup = await buildLogicalBackupZip({ includeShares: true })
  const fileName = `pre-restore-${getLogicalBackupFileName()}`

  await mkdir(PRE_RESTORE_BACKUP_DIR, { recursive: true })
  await writeFile(join(PRE_RESTORE_BACKUP_DIR, fileName), backup)

  return fileName
}

export async function restoreLogicalBackupZip(
  backup: Buffer,
  options: RestoreLogicalBackupOptions
) {
  if (restoreInProgress) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A restore is already running'
    })
  }

  restoreInProgress = true

  try {
    return await restoreLogicalBackupZipUnsafe(backup, options)
  } finally {
    restoreInProgress = false
  }
}

async function restoreLogicalBackupZipUnsafe(backup: Buffer, options: RestoreLogicalBackupOptions) {
  if (backup.length > LOGICAL_BACKUP_MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Backup file is too large'
    })
  }

  let payload: LogicalBackupPayload
  try {
    payload = parseLogicalBackupPayload(backup)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid logical backup ZIP'
    })
  }

  let safetyBackupFileName: string
  try {
    safetyBackupFileName = await savePreRestoreBackup()
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not create pre-restore safety backup'
    })
  }

  const projectIds = new Set(payload.data.projects.map(project => project.id))
  const chatIds = new Set(payload.data.chats.map(chat => chat.id))
  const paperlessDocumentIds = new Set(payload.data.paperlessDocuments.map(document => document.id))

  const projectRows: (typeof schema.projects.$inferInsert)[] = payload.data.projects.map(
    project => ({
      id: project.id,
      userId: options.ownerUserId,
      name: project.name,
      createdAt: toDate(project.createdAt)
    })
  )

  const paperlessDocumentRows: (typeof schema.paperlessDocuments.$inferInsert)[] =
    payload.data.paperlessDocuments.map(document => ({
      id: document.id,
      title: document.title,
      correspondent: document.correspondent,
      documentType: document.documentType,
      storagePath: document.storagePath,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      pageCount: document.pageCount,
      ocrContent: document.ocrContent,
      aiContent: document.aiContent,
      ocrMethod: document.ocrMethod,
      processingModel: document.processingModel,
      processed: document.processed,
      processingStartedAt: toNullableDate(document.processingStartedAt),
      processingCompletedAt: toNullableDate(document.processingCompletedAt),
      paperlessCreated: toNullableDate(document.paperlessCreated),
      paperlessModified: toNullableDate(document.paperlessModified),
      createdAt: toDate(document.createdAt),
      updatedAt: toDate(document.updatedAt),
      deletedAt: toNullableDate(document.deletedAt)
    }))

  const chatRows: (typeof schema.chats.$inferInsert)[] = payload.data.chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    userId: options.ownerUserId,
    visibility: chat.visibility,
    personality: chat.personality,
    projectId: chat.projectId && projectIds.has(chat.projectId) ? chat.projectId : null,
    documentId:
      chat.documentId && paperlessDocumentIds.has(chat.documentId) ? chat.documentId : null,
    createdAt: toDate(chat.createdAt)
  }))

  const messageRows: (typeof schema.messages.$inferInsert)[] = payload.data.messages
    .filter(message => chatIds.has(message.chatId))
    .map(message => ({
      id: message.id,
      chatId: message.chatId,
      role: message.role,
      parts: message.parts ?? null,
      createdAt: toDate(message.createdAt)
    }))

  const chatDocumentRows: (typeof schema.chatDocuments.$inferInsert)[] = payload.data.chatDocuments
    .filter(
      document => chatIds.has(document.chatId) && paperlessDocumentIds.has(document.documentId)
    )
    .map(document => ({
      chatId: document.chatId,
      documentId: document.documentId,
      position: document.position,
      createdAt: toDate(document.createdAt)
    }))

  const customPersonalityRows: (typeof schema.customPersonalities.$inferInsert)[] =
    payload.data.customPersonalities.map(personality => ({
      id: personality.id,
      userId: options.ownerUserId,
      label: personality.label,
      prompt: personality.prompt,
      createdAt: toDate(personality.createdAt),
      updatedAt: toDate(personality.updatedAt)
    }))

  const appSettingRows: (typeof schema.appSettings.$inferInsert)[] = payload.data.appSettings.map(
    setting => ({
      key: setting.key,
      value: setting.value,
      createdAt: toDate(setting.createdAt),
      updatedAt: toDate(setting.updatedAt)
    })
  )

  const chatShareRows: (typeof schema.chatShares.$inferInsert)[] = payload.data.chatShares
    .filter(share => chatIds.has(share.chatId))
    .map(share => ({
      id: share.id,
      token: share.token,
      chatId: share.chatId,
      ownerUserId: options.ownerUserId,
      mode: share.mode,
      active: share.active,
      expiresAt: toNullableDate(share.expiresAt),
      revokedAt: toNullableDate(share.revokedAt),
      createdAt: toDate(share.createdAt)
    }))

  await db.transaction(async transaction => {
    await transaction.delete(schema.chatDocuments)
    await transaction.delete(schema.chatShares)
    await transaction.delete(schema.messages)
    await transaction.delete(schema.chats)
    await transaction.delete(schema.projects)
    await transaction.delete(schema.customPersonalities)
    await transaction.delete(schema.appSettings)
    await transaction.delete(schema.paperlessDocuments)

    if (projectRows.length > 0) await transaction.insert(schema.projects).values(projectRows)
    if (paperlessDocumentRows.length > 0) {
      await transaction.insert(schema.paperlessDocuments).values(paperlessDocumentRows)
    }
    if (chatRows.length > 0) await transaction.insert(schema.chats).values(chatRows)
    if (messageRows.length > 0) await transaction.insert(schema.messages).values(messageRows)
    if (chatDocumentRows.length > 0) {
      await transaction.insert(schema.chatDocuments).values(chatDocumentRows)
    }
    if (customPersonalityRows.length > 0) {
      await transaction.insert(schema.customPersonalities).values(customPersonalityRows)
    }
    if (appSettingRows.length > 0)
      await transaction.insert(schema.appSettings).values(appSettingRows)
    if (chatShareRows.length > 0) await transaction.insert(schema.chatShares).values(chatShareRows)
  })

  const counts: LogicalBackupCounts = {
    projects: projectRows.length,
    chats: chatRows.length,
    messages: messageRows.length,
    custom_personalities: customPersonalityRows.length,
    app_settings: appSettingRows.length,
    paperless_documents: paperlessDocumentRows.length,
    chat_documents: chatDocumentRows.length,
    chat_shares: chatShareRows.length
  }

  return {
    ok: true as const,
    restoredAt: new Date().toISOString(),
    ownerEmail: options.ownerEmail,
    safetyBackupFileName,
    counts,
    authTablesSkipped: [...LOGICAL_BACKUP_EXCLUDED_AUTH_TABLES]
  }
}

export function getLogicalBackupFileName(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, '-')
  return `taan-mind-logical-backup-${stamp}.zip`
}
