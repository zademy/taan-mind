---
type: Concepto
title: Modelo de datos
description: Drizzle ORM sobre SQLite (libsql) — esquema en server/db/schema.ts y migraciones generadas, nunca editadas a mano.
tags: [datos, drizzle, sqlite, migraciones]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Modelo de datos

La persistencia de Taan Mind usa **Drizzle ORM** sobre **SQLite** (driver libsql).

## Ubicaciones

- Esquema: `server/db/schema.ts`.
- Migraciones: `server/db/migrations/sqlite/`.

## Ciclo de cambios

1. Editar `server/db/schema.ts`.
2. `pnpm db:generate` para generar la migración.
3. `pnpm db:migrate` para aplicarla.

El SQL de migración generado **no se edita a mano**: si hay que corregirlo, se corrige el esquema y se regenera.

## Relacionado

- [Autenticación](./autenticacion.md) — las sesiones viven aquí.
- [Cómo empezar](./como-empezar.md) — tabla completa de comandos.

## Fuentes

- [AGENTS.md](../AGENTS.md)
