---
type: Concepto
title: Arquitectura
description: Estructura de Taan Mind — Nuxt 4 con Nitro, capas app/server/shared y convenciones del código.
tags: [arquitectura, nuxt, nitro]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Arquitectura

Taan Mind es una aplicación full-stack **Nuxt 4** (Vue 3, TypeScript) con rutas de servidor **Nitro**, organizada en tres superficies.

## Stack principal

- **Nuxt UI 4 + Tailwind CSS 4** — configuración CSS-first en `app/assets/css/main.css`; no existe archivo `tailwind.config`.
- **Docker** — Dockerfile multi-stage; el stack de Compose incluye Paperless-ngx.
- **Drizzle ORM + SQLite** (libsql) — véase [Modelo de datos](./modelo-de-datos.md).
- **Vercel AI SDK** — véase [Proveedores de IA](./proveedores-ia.md).

## Capas

| Capa | Ruta | Contenido |
| --- | --- | --- |
| Cliente | `app/` | `pages/`, `components/` agrupados por feature, `composables/` (incluido el grupo de dominio `usePaperless/`), `layouts/`, `middleware/` (`auth.global.ts`), `utils/` |
| Servidor | `server/` | `api/` con rutas agrupadas por dominio (chats, paperless, ocr, kpi, cache, personalities, projects, settings, usage, devices…), `utils/` auto-importados, `db/`, `plugins/` y `middleware/auth.ts` |
| Compartida | `shared/` | `types/`, `utils/` y `constants/` usados por ambos lados |

## Convenciones

- Las rutas de API siguen el nombrado de Nitro: `documents.get.ts`, `chats.post.ts`, `[id].patch.ts`, `[id].delete.ts`; los parámetros llegan por `event.context.params`.
- Los helpers de servidor viven en `server/utils/` (auto-importados por Nitro); los tipos que cruzan fronteras, en `shared/types/`.
- Validación de entrada con Zod, imitando las formas de respuesta de los handlers vecinos del mismo dominio.
- Componentes auto-importados en PascalCase; composables con prefijo `use`. Se prefieren componentes Nuxt UI e iconos lucide.

## Relacionado

- [Cómo empezar](./como-empezar.md)
- [Integración Paperless-ngx](./integracion-paperless.md)
- [Flujo OCR](./flujo-ocr.md)

## Fuentes

- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
