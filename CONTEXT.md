# Taan Mind Domain Context

## Document Processing

**Paperless document**: A document managed by Paperless-ngx and mirrored in Taan Mind for search, selection, OCR state, and AI enrichment.

**Processing record**: Taan Mind's local state for a Paperless document, including OCR content, processing status, processing attempts, and extracted metadata.

**Document-processing run**: One complete attempt to enrich one claimed processing record. It downloads the Paperless document, extracts text, formats content, extracts metadata, updates empty Paperless fields, records AI usage, and transitions local processing state.

**Scheduler**: Background timing and concurrency control that claims at most one eligible processing record and delegates one document-processing run. It does not own OCR, enrichment, Paperless mutation, or processing-state policy.

**Claimed processing record**: The oldest record eligible for work after its status has moved from pending or recoverable processing to processing and its attempt count has incremented.

**Enrichment model**: The app-wide language model selected for content formatting and metadata extraction. Background processing uses a global setting because it does not run in a user session.

**Terminal failure**: A processing record that exhausted the configured attempt limit and will not be selected again without an explicit reset.

## Integrations

**Paperless adapter**: The concrete integration with Paperless-ngx for document download, taxonomy lookup or creation, archive serial assignment, and document updates. Paperless is the only production document-management adapter.

**OCR pipeline**: MIME-aware text extraction using direct parsers, image conversion, PDF rendering, and Ollama OCR as appropriate for the source document.

## Architecture Vocabulary

Use `module`, `interface`, `implementation`, `depth`, `seam`, `adapter`, `leverage`, `locality`, and `deletion test` when discussing architecture.
