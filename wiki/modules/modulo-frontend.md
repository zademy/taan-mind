---
type: Modulo
title: Módulo frontend
description: Superficie de cliente — páginas, componentes por feature, composables, layouts y middleware de Nuxt.
tags: [modulo, frontend, nuxt, ui]
---

La superficie de cliente de Taan Mind bajo `app/`, construida con **Nuxt UI 4 + Tailwind CSS 4**.

## Superficie

- **Páginas** (`app/pages/`): `/` (inicio), `/chat/[id]`, `/documents`, `/usage`, `/login`, `/share/*` (vista pública de chat compartido).
- **Componentes** (`app/components/`) agrupados por feature: `chat/` (+ `message/`, `tool/`), `ai/`, `sidebar/`, `projects/`, `settings/`.
- **Composables** (`app/composables/`): chats, modelos, estadísticas y el grupo de dominio `usePaperless/`.
- **Layouts** (`app/layouts/`) — layout con barra lateral plegable.
- **Middleware** (`app/middleware/auth.global.ts`) — protección global de rutas en el cliente.
- **Estilos** — configuración CSS-first en `app/assets/css/main.css`; no existe `tailwind.config`.

## Comportamiento

- Componentes auto-importados en PascalCase; composables con prefijo `use`; se prefieren componentes Nuxt UI e iconos lucide.
- El cliente consume exclusivamente las APIs Nitro de la app (véase [vista general de arquitectura](../architecture/vista-general.md)); nunca habla directo con Paperless ni con proveedores de IA.
- La vista de chat compartido (`/share/chat/`) es de solo lectura, sin barra lateral, validada por token opaco.

## Relacionado

- [Módulo chat](./modulo-chat.md), [módulo paperless](./modulo-paperless.md), [módulo KPI](./modulo-kpi.md).
- [Chat con streaming](../flows/chat-streaming.md).

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
