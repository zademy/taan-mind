---
type: Guia
title: Desarrollo de cambios
description: Convenciones para modificar código, tocar el esquema de datos y pasar la puerta de verificación.
tags: [guia, desarrollo, convenciones, migraciones]
---

# Desarrollo de cambios

Cómo hacer cambios en Taan Mind respetando las convenciones del repositorio.

## Requisitos previos

- Entorno levantado según [Cómo empezar](./como-empezar.md).

## Cambios de código

1. **Ubica el dominio** en `server/api/` (rutas agrupadas por dominio) o en `app/` (superficie de cliente).
2. **Helpers de servidor** nuevos van en `server/utils/` (auto-importados por Nitro); los tipos que cruzan fronteras, en `shared/types/`.
3. **Valida la entrada con Zod** e imita las formas de respuesta de los handlers vecinos del mismo dominio.
4. **Nombres de rutas Nitro**: `documents.get.ts`, `chats.post.ts`, `[id].patch.ts`, `[id].delete.ts`; los parámetros llegan por `event.context.params`.
5. **Workers de fondo**: conserva la vía `internalApiAuth` en `paperless-sync.ts` y `document-processor.ts`.

## Cambios de esquema de datos

1. Edita `server/db/schema.ts`.
2. `pnpm db:generate` genera la migración.
3. `pnpm db:migrate` la aplica.

El SQL generado **no se edita a mano**; corrige el esquema y regenera. Detalle en [Modelo de datos](../concepts/modelo-de-datos.md).

## Puerta de verificación

- `pnpm build:check` (formato + lint + build) antes de dar por terminado cualquier cambio.
- El hook pre-commit (simple-git-hooks + lint-staged) auto-corrige los archivos stageados; los commits deben pasarlo.
- CI (`.github/workflows/`) ejecuta lint + typecheck.

## Relacionado

- [Vista general de arquitectura](../architecture/vista-general.md) — convenciones completas.
- [Workers de fondo](../architecture/decision-workers-fondo.md) — gotcha de `internalApiAuth`.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
