<p align="center">
  <img src="app/assets/images/logo.png" alt="Taan Mind" width="80" height="80">
  <h1 align="center">Taan Mind</h1>
</p>

<p align="center">
  A privacy-focused AI workspace for chat, automatic OCR, document workflows, and KPI dashboards — built with Nuxt 4.
</p>

<p align="center">
  Based on the <a href="https://github.com/nuxt-ui-templates/chat">Nuxt UI Chat Template</a> and adapted into an AI-powered companion for <a href="https://github.com/paperless-ngx/paperless-ngx">Paperless-ngx</a> with document sync, OCR, metadata enrichment, and document-aware chat.
</p>

<p align="center">
  <img alt="Nuxt 4.4.2" src="https://img.shields.io/badge/Nuxt-4.4.2-00DC82?style=for-the-badge&logo=nuxt&logoColor=white">
  <img alt="Nuxt UI 4.6.1" src="https://img.shields.io/badge/Nuxt%20UI-4.6.1-00DC82?style=for-the-badge&logo=nuxt&logoColor=white">
  <a href="https://ui.nuxt.com"><img alt="Made with Nuxt UI" src="https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?style=for-the-badge&logo=nuxt&logoColor=white&labelColor=111827"></a>
  <img alt="AI SDK 6.0.158" src="https://img.shields.io/badge/AI%20SDK-6.0.158-000000?style=for-the-badge&logo=vercel&logoColor=white">
  <img alt="Drizzle ORM 0.45.2" src="https://img.shields.io/badge/Drizzle%20ORM-0.45.2-C5F74F?style=for-the-badge&logo=drizzle&logoColor=000000">
  <img alt="Tailwind CSS 4.2.2" src="https://img.shields.io/badge/Tailwind%20CSS-4.2.2-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img alt="Ollama runtime" src="https://img.shields.io/badge/Ollama-Runtime-111111?style=for-the-badge&logo=ollama&logoColor=white">
  <img alt="nuxt-charts 2.1.4" src="https://img.shields.io/badge/nuxt--charts-2.1.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white"> <a href="https://deepwiki.com/zademy/taan-mind"><img alt="DeepWiki" src="https://img.shields.io/badge/DeepWiki-Ask%20AI-5b21b6?style=for-the-badge&logo=googledocs&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/taan-mind?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-taan-mind" target="_blank" rel="noopener noreferrer"><img alt="Taan Mind - Intelligent paperless workspace | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1143366&amp;theme=light&amp;t=1778385664273"></a>
</p>

---

## Features

- **AI Chat** — Streaming conversations with multiple AI providers (MiniMax, GLM, OpenAI, OpenRouter, Nova, and available Ollama models) and personality presets
- **[Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) Integration** — Full document management proxy with CRUD, search, and binary download
- **Automatic OCR** — Background document processing pipeline using Ollama + MuPDF
- **AI Metadata Extraction** — Auto-suggest titles, tags, correspondents, and document types
- **KPI Dashboard** — Document statistics with interactive charts (status, timeline, MIME type, document type)
- **Document Context** — Inject [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) document content (OCR/AI-processed) as context into chats
- **Read-only Chat Sharing** — Generate revocable live share links that expose a minimal no-sidebar transcript view
- **AI Tools** — Chart generation, weather forecasts, and web search sources
- **Anonymous Sessions** — No login required, HTTP-only session cookies with local SQLite storage
- **Docker Ready** — Multi-stage Dockerfile with hardened runtime and integrated Paperless-ngx stack via Docker Compose

## Tech Stack

| Technology                                           | Purpose                            |
| ---------------------------------------------------- | ---------------------------------- |
| [Nuxt 4](https://nuxt.com/)                          | Full-stack Vue 3 framework         |
| [Nuxt UI 4](https://ui.nuxt.com/)                    | Component library (Tailwind CSS 4) |
| [AI SDK](https://sdk.vercel.ai/)                     | Streaming AI integration           |
| [Drizzle ORM](https://orm.drizzle.team/)             | Type-safe SQLite ORM               |
| [NuxtHub](https://hub.nuxt.com/)                     | Database & deployment              |
| [Ollama](https://ollama.com/)                        | Local LLM for OCR                  |
| [MuPDF](https://mupdf.com/)                          | PDF/image processing               |
| [Comark](https://comark.ca/)                         | Markdown rendering                 |
| [nuxt-charts](https://github.com/nuxt-modules/chart) | Chart.js visualizations            |

## Architecture Overview

The application combines a Nuxt user interface, Nitro API routes, background workers, Paperless-ngx, local SQLite storage, and AI providers. The diagram below shows the main runtime flow from the user to document storage, OCR, enrichment, and synchronization.

```mermaid
flowchart LR
  internet["User / Internet"]

  subgraph client["Client"]
    browser["Browser"]
    nuxtApp["Nuxt UI\npages, components, composables"]
  end

  subgraph app["Taan Mind App"]
    api["Nitro API Layer"]
    chatApi["Chat API\n/api/chats/*"]
    paperlessProxy["Paperless Proxy\n/api/paperless/*"]
    cacheApi["Cache and KPI APIs\n/api/cache, /api/kpi"]
    ocrApi["OCR API\n/api/ocr/*"]
    settingsApi["Settings API\n/api/settings/*"]
    modelRegistry["Model Registry\nshared/utils/models.ts"]
    syncWorker["Paperless Sync Plugin\nperiodic import"]
    processor["Document Processor Plugin\nOCR → cleanup → AI enrichment → Paperless patch"]
    appDb["SQLite / NuxtHub DB\nchats, messages, document cache, settings"]
  end

  subgraph ai["AI and OCR Models"]
    externalModels["External AI Providers\nMiniMax, GLM, OpenAI, OpenRouter, Nova"]
    ollamaChat["Ollama Chat Models\nnon-OCR models"]
    ollamaOcr["Ollama OCR Models\nglm-ocr, OCR-GLM"]
    mupdf["MuPDF\nPDF/image page extraction"]
  end

  subgraph paperless["Paperless-ngx Stack"]
    paperlessApi["Paperless-ngx API"]
    paperlessDb["PostgreSQL\nPaperless metadata"]
    redis["Redis\nbackground task broker"]
    tika["Tika\ntext extraction"]
    gotenberg["Gotenberg\nPDF rendering"]
    media["Document Media\noriginal files, previews, thumbnails"]
  end

  internet --> browser --> nuxtApp --> api

  api --> chatApi
  api --> paperlessProxy
  api --> cacheApi
  api --> ocrApi
  api --> settingsApi

  chatApi --> modelRegistry
  chatApi --> externalModels
  chatApi --> ollamaChat
  chatApi --> appDb

  settingsApi --> modelRegistry
  settingsApi --> appDb

  cacheApi --> appDb
  paperlessProxy --> paperlessApi

  ocrApi --> mupdf
  ocrApi --> ollamaOcr

  syncWorker --> paperlessApi
  syncWorker --> appDb

  processor --> appDb
  processor --> ocrApi
  processor --> modelRegistry
  processor --> externalModels
  processor --> ollamaChat
  processor --> paperlessApi

  paperlessApi --> paperlessDb
  paperlessApi --> redis
  paperlessApi --> tika
  paperlessApi --> gotenberg
  paperlessApi --> media
```

At a high level:

- Users interact with the Nuxt client, which calls Nitro API routes.
- Chat requests use the shared model registry and can call MiniMax, GLM, OpenAI, OpenRouter, Nova, or selectable non-OCR Ollama models.
- OCR requests use MuPDF and OCR-specific Ollama models to extract document text.
- The Paperless proxy keeps Paperless operations behind the app API.
- The sync worker imports Paperless document metadata into the app database.
- The document processor reads cached documents, runs OCR, enriches the result with the selected AI model, and patches missing metadata back into Paperless.
- SQLite stores app-owned data such as anonymous chats, cached document content, processing status, and settings.
- Paperless keeps its own metadata, task queue, rendering services, and media files inside the Paperless-ngx stack.

## Screenshots

<p align="center">
  <a href="images/01.png"><img src="images/01.png" width="32%"></a>
  <a href="images/02.png"><img src="images/02.png" width="32%"></a>
  <a href="images/03.png"><img src="images/03.png" width="32%"></a>
</p>
<p align="center">
  <a href="images/04.png"><img src="images/04.png" width="32%"></a>
  <a href="images/05.png"><img src="images/05.png" width="32%"></a>
  <a href="images/06.png"><img src="images/06.png" width="32%"></a>
</p>
<p align="center">
  <a href="images/07.png"><img src="images/07.png" width="32%"></a>
  <a href="images/08.png"><img src="images/08.png" width="32%"></a>
  <a href="images/09.png"><img src="images/09.png" width="32%"></a>
</p>
<p align="center">
  <a href="images/10.png"><img src="images/10.png" width="32%"></a>
  <a href="images/11.png"><img src="images/11.png" width="32%"></a>
  <a href="images/12.png"><img src="images/12.png" width="32%"></a>
</p>

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+

### Installation

```bash
git clone https://github.com/zademy/taan-mind.git
cd taan-mind
pnpm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env` with your API keys (see [Environment Variables](#environment-variables)).

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker Compose (Full Stack)

The included `docker-compose.yml` spins up the entire stack — the app, Paperless-ngx (with Redis, PostgreSQL, Gotenberg, and Tika), and a bootstrap service that creates the admin user and API token.

```bash
# Build and start everything
docker compose up -d --build

# Remove the completed bootstrap container after startup
docker compose rm -f paperless-bootstrap
```

> [!NOTE]
> Docker Compose does **not** start Ollama. See [Ollama Runtime](#ollama-runtime) for details.

The app runs on `http://localhost:3000` and Paperless-ngx on `http://localhost:8000`.

## Environment Variables

| Variable                       | Required | Description                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `MINIMAX_API_KEY`              | Yes      | MiniMax API key                                                    |
| `MINIMAX_BASE_URL`             | No       | MiniMax API endpoint                                               |
| `GLM_API_KEY`                  | Yes      | Z.AI GLM API key                                                   |
| `GLM_BASE_URL`                 | No       | Z.AI API endpoint                                                  |
| `OPENAI_API_KEY`               | Yes      | OpenAI API key                                                     |
| `OPENROUTER_API_KEY`           | No       | OpenRouter API key for dynamic model discovery and chat/enrichment |
| `NOVA_API_KEY`                 | Yes      | Amazon Nova API key                                                |
| `NOVA_BASE_URL`                | No       | Amazon Nova API endpoint                                           |
| `NUXT_PAPERLESS_BASE_URL`      | Yes      | Paperless-ngx instance URL                                         |
| `NUXT_PAPERLESS_API_TOKEN`     | Yes      | Paperless-ngx API token                                            |
| `PAPERLESS_BOOTSTRAP_USER`     | No       | Admin user created by Docker Compose (`paperless`)                 |
| `PAPERLESS_BOOTSTRAP_PASSWORD` | No       | Password for the bootstrap admin user (`paperless`)                |
| `PAPERLESS_BOOTSTRAP_EMAIL`    | No       | Email for the bootstrap admin user (`paperless@example.local`)     |
| `NUXT_OLLAMA_BASE_URL`         | No       | Ollama server URL (`http://host.docker.internal:11434` in Docker)  |
| `NUXT_OLLAMA_MODEL`            | No       | Ollama model for OCR (`glm-ocr:latest`)                            |
| `NUXT_SYNC_INTERVAL_MS`        | No       | Paperless sync interval in ms (`5000`)                             |
| `NUXT_PROCESS_INTERVAL_MS`     | No       | Document processing interval in ms (`10000`)                       |

## Ollama Runtime

Docker Compose does not start Ollama. Run Ollama outside this stack and point the app to it with `NUXT_OLLAMA_BASE_URL`. When reachable, locally pulled Ollama models are automatically listed in the chat model selector.

This is intentional. Ollama runtime choices depend on the host operating system and hardware:

- **macOS** — Install Ollama on the host for Metal GPU acceleration
- **Linux + NVIDIA** — Use Docker GPU support (requires NVIDIA Container Toolkit)
- **Linux + AMD** — Requires ROCm and different device mappings
- **No GPU** — Run Ollama on CPU

Install Ollama for your host, then pull the OCR model and any chat models you want to expose:

```bash
ollama pull glm-ocr:latest
ollama pull llama3.2:latest
```

For Docker Compose, configure the app container to reach host Ollama:

```env
NUXT_OLLAMA_BASE_URL=http://host.docker.internal:11434
NUXT_OLLAMA_MODEL=glm-ocr:latest
```

For local development without Docker:

```env
NUXT_OLLAMA_BASE_URL=http://localhost:11434
NUXT_OLLAMA_MODEL=glm-ocr:latest
```

## Docker Compose Paperless Bootstrap

When you run the integrated Docker Compose stack, the `paperless-bootstrap` service waits for Paperless-ngx to become healthy, then creates or updates an admin user and registers the API token used by the app.

Default bootstrap identity:

```env
PAPERLESS_BOOTSTRAP_USER=paperless
PAPERLESS_BOOTSTRAP_PASSWORD=paperless
PAPERLESS_BOOTSTRAP_EMAIL=paperless@example.local
```

Token behavior:

```env
# Manual mode: use this exact token for Paperless and the app.
NUXT_PAPERLESS_API_TOKEN=your_token_here

# Automatic mode: leave it empty and let the stack derive a token deterministically.
NUXT_PAPERLESS_API_TOKEN=
```

If `NUXT_PAPERLESS_API_TOKEN` has a value, `paperless-bootstrap` registers that exact token in Paperless and the app uses the same value.

If `NUXT_PAPERLESS_API_TOKEN` is empty, the stack derives the token from the bootstrap identity and `PAPERLESS_SECRET_KEY`. The same deterministic input values must be available to both `paperless-bootstrap` and the app.

> [!TIP]
> Change the bootstrap values in `.env` before the first `docker compose up` if you want different Paperless admin credentials.

## Project Structure

```
paperless-ui-chat/
├── app/
│   ├── components/          # Vue components (chat, tools, selectors, stats)
│   ├── composables/         # Reactive logic (models, chats, paperless, OCR, stats)
│   ├── layouts/             # App layout with collapsible sidebar
│   ├── pages/               # Routes: /, /chat/[id], /documents
│   └── utils/               # Client-side helpers
├── server/
│   ├── api/                 # API routes (chats, cache, OCR, paperless proxy, KPI, health)
│   ├── db/                  # Drizzle schema + migrations (chats, messages, paperless_documents)
│   ├── plugins/             # Background sync & document processing
│   └── utils/               # Server utilities (AI models, session, OCR pipeline)
├── shared/
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Models, personalities, AI tool definitions
├── .github/workflows/       # CI (lint + typecheck)
├── docker-compose.yml       # Full stack with Paperless-ngx
├── Dockerfile               # Multi-stage build with auto-migration entrypoint
└── nuxt.config.ts
```

## API Overview

| Endpoint                       | Description                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| `POST /api/chats/:id`          | AI streaming chat with document context and tool support              |
| `/api/chats/:id/share`         | Owner-only create/read/rotate/revoke controls for live share links    |
| `GET /api/shared-chats/:token` | Public read-only shared chat transcript by opaque token               |
| `GET /api/cache/documents`     | Paginated cached documents with filters and sorting                   |
| `GET /api/kpi/documents`       | Aggregated document statistics (status, MIME type, month, type)       |
| `GET /api/health`              | Lightweight liveness check for container health                       |
| `POST /api/ocr/extract`        | Extract text from uploaded files via Ollama + MuPDF                   |
| `/api/paperless/*`             | Full Paperless-ngx CRUD proxy (documents, tags, correspondents, etc.) |

## AI Models

| Provider   | Model ID                           | Display Name                                                  |
| ---------- | ---------------------------------- | ------------------------------------------------------------- |
| MiniMax    | `minimax/MiniMax-M2.7`             | MiniMax M2.7                                                  |
| GLM        | `glm/glm-5`                        | GLM 5                                                         |
| GLM        | `glm/glm-5.1`                      | GLM 5.1                                                       |
| GLM        | `glm/glm-5-turbo`                  | GLM 5 Turbo                                                   |
| OpenAI     | `openai/gpt-5.5`                   | OpenAI GPT-5.5                                                |
| OpenAI     | `openai/gpt-5.4`                   | OpenAI GPT-5.4                                                |
| OpenAI     | `openai/gpt-5.4-mini`              | OpenAI GPT-5.4 Mini                                           |
| OpenAI     | `openai/gpt-5.4-nano`              | OpenAI GPT-5.4 Nano                                           |
| OpenAI     | `openai/gpt-5.3-chat-latest`       | OpenAI GPT-5.3 Chat                                           |
| OpenAI     | `openai/gpt-5.2`                   | OpenAI GPT-5.2                                                |
| OpenAI     | `openai/gpt-5.1`                   | OpenAI GPT-5.1                                                |
| OpenAI     | `openai/gpt-5.1-codex`             | OpenAI GPT-5.1 Codex                                          |
| OpenAI     | `openai/gpt-5.1-codex-mini`        | OpenAI GPT-5.1 Codex Mini                                     |
| OpenAI     | `openai/gpt-5`                     | OpenAI GPT-5                                                  |
| OpenAI     | `openai/gpt-5-mini`                | OpenAI GPT-5 Mini                                             |
| OpenAI     | `openai/gpt-5-nano`                | OpenAI GPT-5 Nano                                             |
| Nova       | `nova/nova-2-lite-v1`              | Amazon Nova 2 Lite                                            |
| Nova       | `nova/nova-micro-v1`               | Amazon Nova Micro                                             |
| Nova       | `nova/nova-lite-v1`                | Amazon Nova Lite                                              |
| Nova       | `nova/nova-pro-v1`                 | Amazon Nova Pro                                               |
| Nova       | `nova/nova-premier-v1`             | Amazon Nova Premier                                           |
| Ollama     | `ollama/<model-name>`              | Discovered from `/api/tags` when Ollama is reachable          |
| OpenRouter | `openrouter/<provider>/<model-id>` | Discovered from `/api/v1/models` when OpenRouter is reachable |

> [!NOTE]
> Ollama and OpenRouter models are dynamic. If `NUXT_OLLAMA_BASE_URL`/`OPENROUTER_API_KEY` is not configured or the provider is unreachable, the selector still shows the static MiniMax/GLM/OpenAI/Nova models.
> OCR-only runtime models are excluded from chat and document-processing selectors; OCR models remain available through the OCR-specific endpoints.
> OpenAI models use the Responses API through the AI SDK adapter. Reasoning summaries are enabled for chat streaming on reasoning-capable GPT-5 models; GPT-5.3 Chat is streamed without reasoning options.
> Nova extended reasoning is enabled with `high` effort only for `nova/nova-2-lite-v1`; other Nova models are called without `reasoning_effort`.

## Scripts

| Script              | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Start development server                         |
| `pnpm build`        | Build for production                             |
| `pnpm build:check`  | Verify formatting and linting, then build        |
| `pnpm preview`      | Preview production build                         |
| `pnpm lint`         | Run ESLint                                       |
| `pnpm lint:fix`     | Run ESLint and apply safe fixes                  |
| `pnpm format`       | Format project files with Prettier               |
| `pnpm format:check` | Check Prettier formatting without changing files |
| `pnpm typecheck`    | Run Vue TypeScript type checking                 |
| `pnpm db:generate`  | Generate Drizzle migrations                      |
| `pnpm db:migrate`   | Run database migrations                          |

## Acknowledgements

Taan Mind started from the [Nuxt UI Chat Template](https://github.com/nuxt-ui-templates/chat), then evolved into a Paperless-ngx companion with document sync, OCR, AI metadata enrichment, and Docker-first deployment. Credit belongs to the template authors for the original UI and chat foundation; the Paperless-specific workflows and deployment changes were added for this project.

## License

This project is licensed under the [MIT License](LICENSE).

## Support Development

If Tata-Mind is useful to you, consider buying me a coffee!

<a href="https://ko-fi.com/C0C01Y1SQI" target="_blank"><img height="26" src="https://img.shields.io/badge/Donate-Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Donate with Ko-fi" /></a> <a href="https://buy.stripe.com/00wcN67J46kl8LY8GYfMA01" target="_blank"><img height="26" src="https://img.shields.io/badge/Donate-Stripe-635bff?style=for-the-badge&logo=stripe&logoColor=white" alt="Donate with Stripe" /></a> <a href="https://www.patreon.com/posts/taan-mind-open-157890170?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link" target="_blank"><img height="26" src="https://img.shields.io/badge/Support-Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white" alt="Support on Patreon" /></a>
