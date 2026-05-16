# Changelog

All notable changes to this project are documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the structure recommended by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates use ISO 8601 format: `YYYY-MM-DD`.

## [1.0.10] - 2026-05-16

### Added

- Inline AI Assistant integration in both the chat page and the home page prompt input. Users can now trigger contextual rewrite and document-intelligence actions directly while composing messages (`AiInlineAssistant` component wired with `model` and `document-ids` props).
- `buildDocumentContextFromIds()` utility in `server/utils/chatDocuments.ts` for building a system-prompt document context section from an explicit ordered ID list (used by the inline AI assistant endpoint).
- Reactive model reference (`useModels()`) added to the home page (`index.vue`) to power inline AI actions.
- `.atl/` directory added to `.gitignore` for local Pi runtime state.

### Changed

- Chat page footer layout restructured from flat `flex-wrap` to `flex-col` with the inline assistant above the model/personality/document selectors for clearer visual hierarchy.
- Sidebar version label bumped to `v1.0.10`.
- Updated `AGENTS.md` and `README.md` documentation to reflect the new inline AI assistant capabilities.

## [1.0.9] - 2026-05-11

### Added

- Centralized AI provider error handling in `server/utils/aiErrors.ts` with `getAIUserErrorMessage()` for safe user-facing messages, `getParsedErrorMessage()` for JSON response parsing, and special-case handling for rate limits (429), insufficient credits (402), and service unavailable (503).
- New screenshots (`images/13.png`, `images/14.png`, `images/15.png`) and updated `README.md` documentation.

### Changed

- Sidebar version label bumped from `v1.0.8` to `v1.0.9`.

## [1.0.8] - 2026-05-10

### Added

- Chat sharing system with revocable, token-based public read-only links (`chatShares` table, `server/utils/chatShares.ts`, `server/utils/shareTokens.ts`).
- Share API endpoints: `GET/POST/PATCH/DELETE /api/chats/:id/share` (owner-scoped) and `GET /api/shared-chats/:token` (public read-only).
- `ShareButton.vue` component for owner-only share controls: create, copy, rotate, and revoke share links via popover UI.
- `Transcript.vue` reusable chat transcript renderer extracted from the chat page, with incremental history loading, configurable actions visibility, and `v-memo` optimization.
- Public share page at `/share/chat/[token]` using a minimal layout (`share.vue`) without sidebar or owner controls.
- Database migration 0011: `chat_shares` table with unique token index, cascade deletes, and owner/active indexes.
- `ChatShare` type exported from `shared/types/db.d.ts`.
- `no-store` cache and `noindex, nofollow` robots headers on the public shared-chat endpoint.

### Changed

- Chat page (`chat/[id].vue`) refactored to use `<ChatTranscript>` component, removing ~100 lines of inline message rendering logic.
- `Navbar` now accepts a default slot for toolbar actions (share button).
- Sidebar version label bumped to `v1.0.8`.

## [1.0.7] - 2026-05-09

### Added

- Reference concept extraction system (`extractReferenceConcepts`) in `app/utils/ai.ts` that scores headings, bold terms, and multi-word/technical phrases from assistant markdown responses to suggest relevant web search links.
- `ReferenceLinks.vue` component rendering compact "Learn more" chips below assistant messages, linking to privacy-friendly DuckDuckGo searches for detected concepts.
- Bilingual (Spanish + English) stop-word and connector lists for concept extraction tuning.
- Full JSDoc documentation and inline comments on all helpers in `app/utils/ai.ts`: `addReferenceCandidate`, `cleanReferenceLabel`, `stripMarkdownForReferences`, `removeEdgeStopWords`, `isUsefulReferenceLabel`, `getReferenceLabelBonus`, `normalizeReferenceKey`.
- Comprehensive component-level documentation in `MessageContent.vue` with part-type/component dispatch table and key concept notes.
- Comprehensive component-level documentation in `ReferenceLinks.vue` with props, data flow, and related files.

### Changed

- `MessageContent.vue` now renders `<ChatMessageReferenceLinks>` below assistant text parts for non-streaming messages.
- Vite `logLevel` set to `error` in `nuxt.config.ts` to reduce development console noise.
- Sidebar version label bumped to `v1.0.7`.

## [1.0.6] - 2026-05-08

### Fixed

- Hydration mismatch on first load caused by timezone-dependent date grouping in sidebar chat list (`useChats` composable deferred to client-only via `onMounted`).

### Changed

- Replaced `if (!x) { x = [] }` with nullish coalescing operator (`??=`) in `useChats` composable for cleaner code.

## [1.0.5] - 2026-05-08

### Added

- Multi-document context selection for chats (up to 5 Paperless documents per chat) replacing the previous single-document attachment.
- `chat_documents` join table with position-aware ordering and cascade deletes.
- `server/utils/chatDocuments.ts` utility for normalizing, attaching, detaching, and fetching chat document context.
- `server/utils/aiErrors.ts` module with `getAIUserErrorMessage` and `getParsedErrorMessage` for safe, user-facing AI provider error messages.
- `server/utils/openrouter.ts` module with OpenRouter model discovery and deprecation filtering.
- OpenRouter as a supported AI provider alongside MiniMax, GLM, and Ollama.
- Database migration 0010: `chat_documents` table and legacy `document_id` column on `chats`.
- Document count badge per chat in the sidebar.

### Changed

- Chat creation and streaming endpoints now accept `documentIds` (array, up to 5) instead of a single `documentId`.
- Document selection component (`DocumentSelect`) upgraded to multi-select mode.
- Sidebar layout refactored to use shared composable and component.
- AI model registry (`shared/utils/models.ts`) expanded with dynamic provider resolution.

## [1.0.4] - 2026-05-03

### Added

- `DocumentProcessingSettings` type and server-side settings API (`GET`/`PATCH` `/api/settings/document-processing`).
- `app_settings` database table for persistent server-side configuration.
- Database migration 0008: `app_settings` table.
- Database migration 0009: `processing_model` column on `paperless_documents`.
- Document enrichment model selector in the UI settings modal.
- Document cache page filters, sorting, and status badges.
- MIME type filter on the documents page.
- Full-text search by title and original filename on the cached documents API.

### Changed

- Document processor plugin uses configurable enrichment model instead of hardcoded MiniMax.
- OCR extract endpoint improved for broader file type support.

### Fixed

- Documents page no longer crashes on missing OCR data.
- Cached documents API correctly handles empty search queries.

## [1.0.3] - 2026-05-03

### Added

- Chat input enhancements with improved display and formatting.
- Dynamic Ollama model discovery with runtime validation against `/api/tags`.
- Additional AI provider configuration options in `nuxt.config.ts`.

### Changed

- AI model selector displays dynamically discovered Ollama models alongside static catalog.
- Updated README with new screenshots and documentation.

### Fixed

- Model selection cookie resets gracefully when a previously selected model becomes unavailable.
- Personality selection survives page reloads via cookie persistence.

## [1.0.2] - 2026-05-02

### Added

- Custom AI personalities with CRUD API (`/api/personalities`) and settings modal.
- `custom_personalities` database table with user-scoped ownership.
- Thinking/reasoning component with collapsible blocks and duration timer for supported models.
- Chat indicator animation (4x4 dot grid) for "thinking" state.
- Tool result display components: `Chart` (line charts), `Weather` (weather cards), `Sources` (web search sources).
- `DocumentsStats` and `DocumentsStatsCharts` components for the document KPI dashboard.
- Navbar component with sidebar collapse toggle, model selector, and color mode button.
- Session utility (`getChatUserId`) with HTTP-only cookie for anonymous user identity.
- Document processing pipeline improvements with Ollama OCR model support.
- Paperless proxy endpoints enhanced with improved error handling.

### Changed

- Chat interface revamped with improved message rendering, edit, and regeneration UX.
- AI model resolution (`server/utils/aiModels.ts`) supports dynamic Ollama provider.
- Layout sidebar shows chat history grouped by date (Today, Yesterday, Last week, etc.).
- Chat messages use AI SDK `parts` array for structured content (text, reasoning, tool calls).

### Fixed

- SSR hydration issues resolved with `ClientOnly` wrappers for dynamic content.
- Document metadata API excludes heavyweight OCR/AI content fields from list responses.
- Message bounding and streaming reliability improvements.

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
