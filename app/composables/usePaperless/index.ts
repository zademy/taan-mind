/**
 * Paperless-ngx API composables barrel export.
 *
 * Re-exports every composable related to the Paperless-ngx integration
 * so they can be imported from `~/composables/usePaperless` in a single statement.
 */

// Documents – CRUD, search, and URL helpers
export { useDocuments, useDocument, useDocumentMutations, useDocumentSearch, useDocumentUrls } from './useDocuments'

// Tags – list, detail, and mutations
export { useTags, useTag, useTagMutations } from './useTags'

// Correspondents – list, detail, and mutations
export { useCorrespondents, useCorrespondent, useCorrespondentMutations } from './useCorrespondents'

// Document types – list, detail, and mutations
export { useDocumentTypes, useDocumentType, useDocumentTypeMutations } from './useDocumentTypes'

// Storage paths – list and detail
export { useStoragePaths, useStoragePath } from './useStoragePaths'

// Background tasks – list and detail
export { usePaperlessTasks, usePaperlessTask } from './useTasks'

// Global statistics
export { usePaperlessStatistics } from './useStatistics'
