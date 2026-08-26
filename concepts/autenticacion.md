---
type: Concepto
title: Autenticación
description: Better Auth con email/contraseña, sesiones en SQLite y bootstrap del admin en la primera ejecución.
tags: [auth, better-auth, seguridad]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Autenticación

La autenticación de Taan Mind se apoya en **Better Auth**.

## Características

- Login por **email/contraseña**.
- **Sesiones persistidas en SQLite** (véase [Modelo de datos](./modelo-de-datos.md)).
- **Bootstrap del admin en la primera ejecución** mediante el plugin de servidor `auth-admin-bootstrap`.

## Puntos en el código

- `app/middleware/auth.global.ts` — middleware global del cliente.
- `server/middleware/auth.ts` — middleware del servidor.
- Las rutas relacionadas viven en la [arquitectura](./arquitectura.md) de `server/api/`.
- Los workers de fondo usan `internalApiAuth` para llamadas internas; véase [Flujo OCR](./flujo-ocr.md).

## Relacionado

- [Cómo empezar](./como-empezar.md) — credenciales iniciales en `.env`.

## Fuentes

- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
