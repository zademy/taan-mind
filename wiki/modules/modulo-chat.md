---
type: Modulo
title: Módulo chat
description: Chats con streaming, chats compartidos, consumo de uso y personalidades — dominios chats, shared-chats, usage y personalities.
tags: [modulo, chat, streaming, compartir]
---

Conversaciones de IA con streaming, contexto documental, herramientas, personalidades y chat compartible de solo lectura.

## Superficie

- `server/api/chats/` — CRUD de chats y mensajes; `POST /api/chats/:id` hace el streaming con contexto documental y soporte de herramientas.
- `server/api/chats/[id]/share` — controles de dueño: crear/leer/rotar/revocar enlaces.
- `server/api/shared-chats/` — `GET /api/shared-chats/:token`, transcripción pública de solo lectura por token opaco.
- `server/api/usage/` — registro y consulta del consumo de IA.
- `server/api/personalities/` — personalidades predefinidas y custom (`server/utils/customPersonalities.ts`).
- Cliente: `app/pages/chat/`, `app/components/chat/`, `app/components/ai/`.
- Helpers: `server/utils/chatDocuments.ts` (contexto documental), `server/utils/chatShares.ts` + `server/utils/shareTokens.ts` (enlaces), `server/utils/aiErrors.ts`.

## Comportamiento

- Sigue el [flujo de chat con streaming](../flows/chat-streaming.md).
- Los modelos disponibles provienen del registro compartido (véase [proveedores de IA](../concepts/proveedores-ia.md)).
- Las herramientas de IA (gráficos, clima, búsqueda web) se definen en `shared/utils/tools/`.

## Relacionado

- [Módulo frontend](./modulo-frontend.md)
- [Módulo proyectos](./modulo-proyectos.md) — chats agrupados por proyecto.

## Fuentes

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
