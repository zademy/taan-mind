---
type: Decision
title: Better Auth con sesiones en SQLite y bootstrap de admin
description: Autenticación email/contraseña con Better Auth, sesiones persistidas localmente y creación del admin en la primera ejecución.
tags: [decision, auth, better-auth, seguridad]
---

## Contexto

La app es multiusuario autoalojada y necesita proteger chats, documentos y ajustes sin depender de un proveedor de identidad externo. Además, en la primera ejecución aún no existe ningún usuario administrador.

## Decisión

Usar **Better Auth** con login por email/contraseña:

- Sesiones persistidas en **SQLite** (véase [SQLite + Drizzle](./decision-sqlite-drizzle.md)).
- El plugin `server/plugins/auth-admin-bootstrap.ts` crea el usuario admin en la primera ejecución, con credenciales iniciales definidas en `.env`.
- Doble barrera de middleware: `app/middleware/auth.global.ts` en el cliente y `server/middleware/auth.ts` en el servidor.
- Los [workers de fondo](./decision-workers-fondo.md) usan `internalApiAuth`, no sesiones.

## Consecuencias

- `BETTER_AUTH_SECRET` es obligatorio en el entorno (Compose lo exige); `BETTER_AUTH_URL` debe apuntar a la URL pública real tras un proxy HTTPS.
- Sin dependencia externa de identidad; el bootstrap evita el problema del primer arranque sin usuario.
- Los enlaces de chat compartido se validan por token opaco revocable, no por sesión.

## Relacionado

- [Autenticación](../concepts/autenticacion.md)
- [Cómo empezar](../guides/como-empezar.md) — credenciales iniciales.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [docker-compose.yml](../../docker-compose.yml)
