/** A generic label-value pair used for chart or list display of statistics. */
interface StatItem {
  /** Human-readable label (e.g., "Pending", "application/pdf"). */
  label: string
  /** Numeric count associated with the label. */
  value: number
}

/**
 * Aggregated KPI metrics for cached Paperless documents.
 * Returned by the `GET /api/kpi/documents` endpoint.
 */
interface DocumentStats {
  /** Total number of cached documents. */
  total: number
  /** Document counts grouped by processing status (Pending, Processed, Processing). */
  byStatus: StatItem[]
  /** Document counts grouped by MIME type (top 8). */
  byMimeType: StatItem[]
  /** Document counts grouped by creation month (YYYY-MM format, chronological). */
  byMonth: StatItem[]
  /** Document counts grouped by document type (top 8, null = Unclassified). */
  byDocumentType: StatItem[]
}

/**
 * Composable that fetches aggregated document KPI statistics.
 *
 * Uses a stable fetch key (`'kpi-documents'`) so the data is shared
 * across components that call this composable simultaneously.
 *
 * @returns A `useFetch` result with the document statistics.
 */
export function useDocumentStats() {
  return useFetch<DocumentStats>('/api/kpi/documents', {
    key: 'kpi-documents'
  })
}
