# Changelog

All notable changes to this project are documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the structure recommended by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates use ISO 8601 format: `YYYY-MM-DD`.

## [1.0.1] - 2026-05-02

### Added

- Delete button for cached documents in the documents table with confirmation modal.
- Soft-delete implementation (`deletedAt` column) to prevent sync plugin from re-inserting deleted records.
- Version label (v1.0.1) in sidebar footer.
- Database migration: `deleted_at` column added to `paperless_documents` table.

### Fixed

- Hydration mismatch on home page caused by dynamic greeting (wrapped in `ClientOnly`).
- KPI charts not reflecting deleted documents (added soft-delete filter to all 5 KPI queries).
- Overlay modal initialization causing potential hydration issues on documents page (lazy-init pattern).

## [1.0.0] - 2026-04-27

### Added

- Full-stack Nuxt 4 AI chat application structure.
- Paperless-ngx API proxy and local document cache.
- OCR processing pipeline with Ollama and MuPDF.
- AI metadata extraction for document titles, tags, correspondents, and document types.
- KPI dashboard for document statistics and processing status.
- Docker Compose stack for local application and Paperless-ngx services.

### Changed

- Project identity updated to Taan Mind with privacy-focused AI document workflows.

### Security

- Anonymous HTTP-only session model documented.
- Paperless API access routed through server-side proxy endpoints.
