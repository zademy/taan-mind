---
type: Modulo
title: Módulo proyectos
description: Agrupación de chats en proyectos — dominio projects con anidación de chats por proyecto.
tags: [modulo, proyectos, organizacion]
---

# Módulo proyectos

Organiza los chats en proyectos para navegación y contexto por tema.

## Superficie

- `server/api/projects/` — CRUD de proyectos (`[id].patch.ts`, `[id].delete.ts`, …).
- `server/api/projects/[id]/chats/` — chats pertenecientes a un proyecto.
- Cliente: `app/components/projects/` y la barra lateral (`app/components/sidebar/`).

## Comportamiento
- Un proyecto agrupa chats; la relación vive en la base local (véase [modelo de datos](../concepts/modelo-de-datos.md)).
- Los chats de un proyecto conservan todo el comportamiento del [módulo chat](./modulo-chat.md); el proyecto solo añade agrupación.

## Relacionado

- [Módulo chat](./modulo-chat.md)
- [Módulo frontend](./modulo-frontend.md)

## Fuentes

- [AGENTS.md](../../AGENTS.md)
