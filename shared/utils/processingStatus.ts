/**
 * Processing lifecycle states persisted in `paperless_documents.processed`.
 */
export enum ProcessingStatus {
  Pending = 0,
  Processed = 1,
  Processing = 2
}

/** Human-readable labels for document processing states. */
export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.Pending]: 'Pending',
  [ProcessingStatus.Processed]: 'Processed',
  [ProcessingStatus.Processing]: 'Processing'
}
