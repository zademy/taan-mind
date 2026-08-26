---
type: Concepto
title: Autenticación
description: Better Auth con email/contraseña, sesiones en SQLite y bootstrap del admin en la primera ejecución.
tags: [auth, better-auth, seguridad]
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
- Rutas relacionadas bajo `server/api/auth/` y `server/routes/auth/`.
- Los workers de fondo usan `internalApiAuth` para llamadas internas; véase [workers de fondo](../architecture/decision-workers-fondo.md).

## Relacionado

- [Decisión: autenticación](../architecture/decision-autenticacion.md) — por qué Better Auth y bootstrap.
- [Cómo empezar](../guides/como-empezar.md) — credenciales iniciales en `.env`.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
