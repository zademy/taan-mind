---
type: Modulo
title: Módulo configuración
description: Ajustes de la app, dispositivos, copias de seguridad lógicas, personalidades y cuenta — dominios settings, settings/devices, settings/backups y account.
tags: [modulo, settings, configuracion, backups]
---

Ajustes de la aplicación y gestión de la cuenta del usuario.

## Superficie

- `server/api/settings/` — ajustes globales de la app, incluido el modelo de enriquecimiento del pipeline.
- `server/api/settings/devices/` — dispositivos reconocidos.
- `server/api/settings/backups/` — copias de seguridad lógicas (`server/utils/logicalBackups.ts`).
- `server/api/account/` — gestión de la cuenta.
- `server/api/personalities/` — personalidades predefinidas y custom.
- Cliente: `app/components/settings/`, `app/pages/`.

## Comportamiento

- El modelo de enriquecimiento es un ajuste global porque el procesamiento en fondo no corre en sesión de usuario (véase [registro de documento](../concepts/registro-de-documento.md)).
- Las copias lógicas operan sobre el contenido de la base SQLite de la app.
- Requiere autenticación de admin para la mayoría de operaciones (véase [autenticación](../concepts/autenticacion.md)).

## Relacionado

- [Módulo chat](./modulo-chat.md) — personalidades aplicadas al chat.
- [Módulo procesamiento](./modulo-procesamiento.md) — consume los ajustes del pipeline.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
