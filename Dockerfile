# ============================================================================
# Dockerfile — paperless-ui-chat
# ============================================================================
#
# Multi-stage Docker build for a Nuxt 3 application backed by libSQL (SQLite).
#
# Build stages:
#   1. base      → Shared Node.js base with pnpm via Corepack
#   2. deps      → Dependency resolution and cache layer
#   3. build     → Full application build (Nuxt / Nitro)
#   4. runtime   → Minimal production image with entrypoint migrations
#
# Requirements:
#   - Docker BuildKit (automatically used by modern Docker)
#   - .env file in build context (optional, for runtime configuration)
#
# Usage:
#   docker build -t paperless-ui-chat:local .
#   docker compose up --build
#
# ============================================================================

# Enable BuildKit syntax for advanced features (heredoc COPY, etc.)
# syntax=docker/dockerfile:1.7

# ── Build-time arguments ────────────────────────────────────────────────────
# These can be overridden at build time via --build-arg.
# NODE_VERSION: Version of the Node.js runtime used across all stages.
# PNPM_VERSION: Version of the pnpm package manager activated via Corepack.
ARG NODE_VERSION=24.14.1
ARG PNPM_VERSION=10.33.2

# ─── Stage 1: base ─────────────────────────────────────────────────────────
# Purpose: Set up the shared base image with Node.js, pnpm, and common
#          environment variables. All subsequent stages inherit from this.
FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION

# Environment variables:
#   COREPACK_ENABLE_DOWNLOAD_PROMPT=0  — Auto-download the requested pnpm
#                                        version without interactive prompts.
#   PNPM_HOME                          — Directory where pnpm itself is stored.
#   PNPM_STORE_DIR / npm_config_store_dir — Central content-addressable store
#                                        for all pnpm packages (shared across
#                                        stages via COPY --from=deps).
#   PATH                               — Ensure pnpm binaries are on $PATH.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_HOME=/pnpm \
    PNPM_STORE_DIR=/pnpm/store \
    npm_config_store_dir=/pnpm/store \
    PATH=/pnpm:$PATH

# Application working directory inside the container.
WORKDIR /app

# Enable Corepack (ships with Node.js) and prepare the exact pnpm version.
RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# ─── Stage 2: deps ─────────────────────────────────────────────────────────
# Purpose: Isolate dependency fetching into its own layer. Because only
#          pnpm-lock.yaml and pnpm-workspace.yaml are copied here, this stage
#          is only re-executed when lockfile or workspace config changes —
#          maximizing Docker layer cache hits during iterative development.
FROM base AS deps

# Copy only lockfile and workspace config to trigger dependency resolution.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Download all dependencies into the shared pnpm store without installing.
# The fetched packages are stored in /pnpm/store and can be copied to later
# stages for offline installation.
RUN pnpm fetch

# ─── Stage 3: build ───────────────────────────────────────────────────────
# Purpose: Install all dependencies from the cached store and compile the
#          Nuxt 3 application into a standalone Nitro server bundle.
FROM base AS build

# Environment variables for the build stage:
#   NODE_ENV=production           — Optimize dependencies for production.
#   NITRO_PRESET=node-server      — Target Nitro's Node.js server preset.
#   NODE_OPTIONS                  — Allocate up to 2.5 GB for the V8 heap
#                                   to handle large Nuxt builds.
#   SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 — Prevent git hooks setup in CI/container.
ENV NODE_ENV=production \
    NITRO_PRESET=node-server \
    NODE_OPTIONS=--max-old-space-size=2560 \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1

# Copy the pre-fetched pnpm package store from the deps stage.
COPY --from=deps /pnpm/store /pnpm/store

# ── Selective file copy ────────────────────────────────────────────────────
# Instead of a broad COPY . ., we copy only the files required for the build.
# This prevents unnecessary cache invalidation when unrelated files change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY nuxt.config.ts tsconfig.json eslint.config.mjs ./
COPY app/ ./app/
COPY server/ ./server/
COPY shared/ ./shared/
COPY public/ ./public/

# Install dependencies offline from the local store (--frozen-lockfile ensures
# reproducibility), then build the Nuxt app.
# After building, copy native libSQL bindings (linux-*) into the Nitro output
# so the runtime stage can use them without the full node_modules.
RUN pnpm install --offline --frozen-lockfile --prod=false \
  && pnpm build \
  && mkdir -p .output/server/node_modules/@libsql \
  && for pkg in node_modules/.pnpm/node_modules/@libsql/linux-*; do \
       if [ -e "$pkg" ]; then cp -aL "$pkg" .output/server/node_modules/@libsql/; fi; \
     done

# ─── Stage 4: runtime ─────────────────────────────────────────────────────
# Purpose: Produce the final minimal production image. Contains only the
#          compiled Nitro output, the SQLite migration files, and a custom
#          entrypoint script that runs database migrations before starting
#          the application server.
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

# Environment variables for the runtime stage:
#   NODE_ENV=production  — Ensure production mode in the Node.js runtime.
#   HOST / NITRO_HOST    — Bind to all interfaces inside the container.
#   PORT / NITRO_PORT    — Default application port.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

WORKDIR /app

# Pre-create the database directory and transfer ownership to the non-root
# user (node) so the application can write SQLite files at runtime.
RUN mkdir -p /app/.data/db \
  && chown -R node:node /app

# ── Entrypoint script (inline heredoc) ─────────────────────────────────────
# This script runs BEFORE the CMD on every container start. It performs:
#   1. Ensures the database directory exists.
#   2. Runs pending SQLite migrations using an inline Node.js script.
#      - Maintains a _app_migrations tracking table for idempotency.
#      - Applies .sql migration files in sorted order.
#      - Silently ignores "already exists" / "duplicate column" errors
#        (safe for re-runs), but re-throws unexpected errors.
#   3. Delegates to the CMD (node .output/server/index.mjs) via exec.
COPY <<'SH' /usr/local/bin/paperless-ui-entrypoint
#!/bin/sh
set -eu

# Ensure the SQLite database directory exists (useful when a fresh volume
# is mounted and the pre-created directory is empty).
mkdir -p /app/.data/db

# ── Inline Node.js migration runner ────────────────────────────────────────
# Connects to the local libSQL/SQLite database and applies any pending .sql
# migration files found in the Nitro output directory.
cd /app/.output/server
node --input-type=module <<'NODE'
import { createClient } from '@libsql/client'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const db = createClient({ url: 'file:/app/.data/db/sqlite.db' })
const migrationsDir = '/app/.output/server/db/migrations/sqlite'

await db.execute('CREATE TABLE IF NOT EXISTS _app_migrations (name text PRIMARY KEY NOT NULL, applied_at integer NOT NULL)')
const applied = new Set((await db.execute('SELECT name FROM _app_migrations')).rows.map(row => row.name))

for (const file of readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue

  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  const statements = sql
    .split('--> statement-breakpoint')
    .map(statement => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    try {
      await db.execute(statement)
    } catch (error) {
      const message = String(error?.message || error)
      if (!/already exists|duplicate column name|no such table: (users|votes)/i.test(message)) {
        throw error
      }
    }
  }

  await db.execute({
    sql: 'INSERT OR IGNORE INTO _app_migrations (name, applied_at) VALUES (?, ?)',
    args: [file, Date.now()]
  })
}
NODE

cd /app
exec "$@"
SH

# Make the entrypoint script executable.
RUN chmod +x /usr/local/bin/paperless-ui-entrypoint

# Copy the compiled Nitro output from the build stage, owned by the node user.
COPY --from=build --chown=node:node /app/.output ./.output
# Copy Drizzle migration SQL files alongside the Nitro server output so the
# entrypoint can find and apply them at runtime.
COPY --from=build --chown=node:node /app/server/db/migrations ./.output/server/db/migrations

# ── Security: run as non-root user ────────────────────────────────────────
# The built-in 'node' user has limited permissions, reducing the attack
# surface in case of container compromise.
USER node

# Document the expected application port.
EXPOSE 3000

# ── Health check ─────────────────────────────────────────────────────────
# Periodically probes the /api/health endpoint to verify the application is
# responsive. Docker uses the result for restart decisions and orchestration.
#   --interval=30s       — Check every 30 seconds.
#   --timeout=5s         — Fail if no response within 5 seconds.
#   --start-period=30s   — Grace period after container start (no failures
#                           counted during this window).
#   --retries=3          — Mark as unhealthy after 3 consecutive failures.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/api/health').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

# Entrypoint: always runs the migration script before delegating to CMD.
ENTRYPOINT ["paperless-ui-entrypoint"]
# Default command: start the Nitro production server.
CMD ["node", ".output/server/index.mjs"]
