/**
 * Paperless-ngx API type definitions.
 * These types represent the responses from the Paperless-ngx REST API.
 */

/**
 * Generic paginated response wrapper used by all Paperless-ngx list endpoints.
 * Provides cursor-based navigation via `next` and `previous` URLs.
 */
export interface PaperlessPaginatedResponse<T> {
  /** Total number of results across all pages. */
  count: number
  /** URL of the next page, or `null` if on the last page. */
  next: string | null
  /** URL of the previous page, or `null` if on the first page. */
  previous: string | null
  /** Array of results for the current page. */
  results: T[]
}

/**
 * Represents a document in Paperless-ngx.
 * Contains metadata, ownership info, custom fields, and permission settings.
 */
export interface PaperlessDocument {
  id: number
  title: string
  content: string
  correspondent: number | null
  document_type: number | null
  storage_path: number | null
  tags: number[]
  created: string
  added: string
  modified: string
  archive_serial_number: number | null
  original_file_name: string
  archived_file_name: string | null
  mime_type: string
  page_count: number
  owner: number | null
  user_can_change: boolean
  notes: string[]
  custom_fields: PaperlessCustomFieldValue[]
  set_permissions: PaperlessPermissions
}

/** Key-value pair for a custom field assigned to a document. */
export interface PaperlessCustomFieldValue {
  field: number
  value: string | number | boolean | null
}

/** View and change permissions for users and groups on a document. */
export interface PaperlessPermissions {
  view: {
    users: number[]
    groups: number[]
  }
  change: {
    users: number[]
    groups: number[]
  }
}

/**
 * Represents a tag in Paperless-ngx used for document classification.
 * Includes color, matching rules, and inbox-tag designation.
 */
export interface PaperlessTag {
  id: number
  name: string
  slug: string
  color: string
  text_color: string
  is_inbox_tag: boolean
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  owner: number | null
  user_can_change: boolean
}

/**
 * Represents a correspondent (sender/recipient) in Paperless-ngx.
 * Used to organize documents by their source or destination.
 */
export interface PaperlessCorrespondent {
  id: number
  name: string
  slug: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  owner: number | null
  user_can_change: boolean
}

/**
 * Represents a document type in Paperless-ngx (e.g., invoice, receipt, contract).
 * Used to categorize documents by their nature.
 */
export interface PaperlessDocumentType {
  id: number
  name: string
  slug: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  owner: number | null
  user_can_change: boolean
}

/**
 * Represents a storage path in Paperless-ngx.
 * Defines where document files are physically stored on disk.
 */
export interface PaperlessStoragePath {
  id: number
  name: string
  slug: string
  path: string
  match: string
  matching_algorithm: number
  is_insensitive: boolean
  document_count: number
  owner: number | null
  user_can_change: boolean
}

/**
 * Represents a background task in Paperless-ngx (e.g., document consumption, OCR).
 * Tracks the lifecycle from creation through completion or failure.
 */
export interface PaperlessTask {
  id: number
  task_id: string
  task_file_name: string | null
  date_created: string
  date_done: string | null
  type: string
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'
  result: string | null
  acknowledged: boolean
  related_document: string | null
}

/**
 * Global statistics returned by the Paperless-ngx dashboard endpoint.
 * Includes document counts, inbox metrics, and file type distribution.
 */
export interface PaperlessStatistics {
  documents_total: number
  documents_inbox: number
  inbox_tag: number | null
  document_file_type_counts: Array<{
    mime_type: string
    mime_type_count: number
  }>
  character_count: number
}

/**
 * Extended document type that includes full-text search hit metadata.
 * Contains relevance score, highlighted snippets, and ranking information.
 */
export interface PaperlessSearchResult extends PaperlessDocument {
  __search_hit__: {
    score: number
    highlights: string
    rank: number
  }
}

/**
 * Represents a saved view (filter preset) in Paperless-ngx.
 * Can be pinned to the dashboard or sidebar for quick access.
 */
export interface PaperlessSavedView {
  id: number
  name: string
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  sort_field: string
  sort_reverse: boolean
  filter_rules: Array<{
    rule_type: number
    value: string
  }>
  owner: number | null
  user_can_change: boolean
}
