---
type: Concepto
title: Modelo de datos
description: Drizzle ORM sobre SQLite (libsql) — esquema en server/db/schema.ts y migraciones generadas, nunca editadas a mano.
tags: [datos, drizzle, sqlite, migraciones]
---

La persistencia de Taan Mind usa **Drizzle ORM** sobre **SQLite** (driver libsql).

## Ubicaciones

- Esquema: `server/db/schema.ts`.
- Migraciones: `server/db/migrations/sqlite/`.
- Tipos derivados: `shared/types/db.d.ts`.

## Tablas principales

- Chats y mensajes (con contexto documental y herramientas).
- Caché de documentos de Paperless con estado de procesamiento y contenido OCR/IA.
- Sesiones de Better Auth.
- Ajustes de la app, dispositivos, personalidades, proyectos y enlaces de chat compartido.

## Ciclo de cambios

1. Editar `server/db/schema.ts`.
2. `pnpm db:generate` para generar la migración.
3. `pnpm db:migrate` para aplicarla.

El SQL de migración generado **no se edita a mano**: si hay que corregirlo, se corrige el esquema y se regenera. Detalle completo en la [decisión de persistencia](../architecture/decision-sqlite-drizzle.md).

## Relacionado

- [Autenticación](./autenticacion.md) — las sesiones viven aquí.
- [Registro de documento](./registro-de-documento.md) — el estado local de cada documento.
- [Desarrollo de cambios](../guides/desarrollo-de-cambios.md) — flujo completo.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
