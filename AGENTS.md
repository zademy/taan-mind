# AGENTS.md — Taan Mind

Full-stack Nuxt 4 app: streaming multi-provider AI chat integrated with Paperless-ngx document management — proxy CRUD, background OCR (Ollama + MuPDF), AI metadata extraction, KPI dashboard, chat sharing. Package name: `taan-mind`.

## Stack

- Nuxt 4 (Vue 3, TypeScript) with Nitro server routes
- Nuxt UI 4 + Tailwind CSS 4 — CSS-first config in `app/assets/css/main.css` (no tailwind.config file)
- Drizzle ORM + SQLite (libsql) — schema at `server/db/schema.ts`, migrations in `server/db/migrations/sqlite/`
- Better Auth — email/password, SQLite sessions, first-run admin bootstrap plugin
- Vercel AI SDK — providers: MiniMax, GLM, Anthropic, OpenAI, OpenRouter, Nova, Ollama
- Docker — multi-stage Dockerfile; Compose stack includes Paperless-ngx

## Commands

Package manager: `pnpm` (pinned 10.34.3).

| Task                 | Command                                                    |
| -------------------- | ---------------------------------------------------------- |
| Dev server           | `pnpm dev`                                                 |
| Verification gate    | `pnpm build:check` (format check + lint + build) — run before finishing any change |
| Lint / fix           | `pnpm lint` / `pnpm lint:fix`                              |
| Format               | `pnpm format`                                              |
| Typecheck            | `pnpm typecheck`                                           |
| DB migrations        | edit `server/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |

Pre-commit hook (simple-git-hooks + lint-staged) auto-fixes staged files; keep commits passing it.

## Structure (Nuxt 4 directories)

- `app/` — client surface: `pages/`, feature-grouped `components/`, `composables/` (incl. `usePaperless/` domain group), `layouts/`, `middleware/` (`auth.global.ts`), `utils/`
- `server/` — Nitro: `api/` (file-based routes grouped by domain: chats, paperless, ocr, kpi, cache, personalities, projects, settings, usage, devices…), `utils/` (auto-imported server helpers), `db/` (schema + migrations), `plugins/` (`auth-admin-bootstrap`, `paperless-sync`, `document-processor` background workers), `middleware/auth.ts`
- `shared/` — types, constants, and utils used by both sides (`types/`, `utils/`, `constants/`)

## Conventions

- API routes follow Nitro file naming: `documents.get.ts`, `chats.post.ts`, `[id].patch.ts`, `[id].delete.ts`; params arrive via `event.context.params`.
- New server helpers live in `server/utils/` (auto-imported by Nitro); cross-boundary types live in `shared/types/`.
- Validate input with Zod; match the response shapes of neighbouring handlers in the same domain.
- Components are auto-imported PascalCase; composables are `use`-prefixed. Prefer Nuxt UI components + lucide icons.

## Gotchas

- Requires `.env` (copy from `.env.example`) — keys drive AI providers, Ollama URL, and the Paperless-ngx connection.
- Background workers (`paperless-sync.ts`, `document-processor.ts`) call internal APIs through `internalApiAuth` — preserve that auth path when touching them.
- Generated migration SQL is not hand-edited; fix the schema and regenerate.
- Reference docs: `README.md` (architecture + diagrams), `CHANGELOG.md`, `CONTRIBUTING.adoc`.
