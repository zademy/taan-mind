---
type: Decision
title: SQLite con Drizzle ORM y migraciones generadas
description: Persistencia local sobre SQLite (libsql) con Drizzle; el SQL de migración nunca se edita a mano.
tags: [decision, sqlite, drizzle, datos]
---

## Contexto

Taan Mind es autoalojado y centrado en la privacidad: la base de datos guarda estado propio de la app (chats, sesiones, caché de documentos, ajustes) junto a un stack ya cargado con el PostgreSQL de Paperless-ngx. Se buscaba persistencia simple, type-safe y embebida.

## Decisión

Usar **Drizzle ORM sobre SQLite** (driver libsql):

- Esquema: `server/db/schema.ts`.
- Migraciones: `server/db/migrations/sqlite/`.

Ciclo de cambios: editar `server/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`. El SQL generado **no se edita a mano**; si hay que corregirlo, se corrige el esquema y se regenera. El entrypoint de Docker ejecuta las migraciones automáticamente al arrancar.

## Consecuencias

- Cero servicio adicional de base de datos para la app; el volumen `app_data` persiste `.data` entre reinicios del contenedor.
- Los datos de Paperless viven en su propio PostgreSQL — la app solo cachea y enriquece; Paperless sigue siendo la fuente de verdad documental.
- Las sesiones de autenticación y el [modelo de datos](../concepts/modelo-de-datos.md) comparten esta base.

## Relacionado

- [Desarrollo de cambios](../guides/desarrollo-de-cambios.md) — flujo completo de migraciones.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
