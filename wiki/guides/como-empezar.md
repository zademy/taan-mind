---
type: Guia
title: Cómo empezar
description: Puesta en marcha de Taan Mind — entorno, comandos y verificación con build:check.
tags: [guia, inicio, pnpm]
---

# Cómo empezar

Guía de puesta en marcha del entorno de desarrollo de Taan Mind.

## Requisitos previos

- Gestor de paquetes `pnpm`, fijado en la versión **10.34.3**.
- Archivo `.env` copiado de `.env.example`: sus claves configuran los proveedores de IA, la URL de Ollama y la conexión con Paperless-ngx.

## Comandos habituales

| Tarea | Comando |
| --- | --- |
| Servidor de desarrollo | `pnpm dev` |
| Puerta de verificación | `pnpm build:check` (formato + lint + build) |
| Lint / corrección | `pnpm lint` / `pnpm lint:fix` |
| Formato | `pnpm format` |
| Tipos | `pnpm typecheck` |
| Migraciones | editar `server/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |

## Reglas de flujo de trabajo

- Ejecutar `pnpm build:check` antes de dar por terminado cualquier cambio.
- El hook pre-commit (simple-git-hooks + lint-staged) corrige automáticamente los archivos stageados; mantén los commits pasándolo.

## Verificación

- `pnpm build:check` verde = formato, lint y build correctos.
- Para despliegue local del stack completo, sigue [Despliegue con Docker](./despliegue-docker.md).

## Relacionado

- [Vista general de arquitectura](../architecture/vista-general.md) para orientarte en el código.
- [Desarrollo de cambios](./desarrollo-de-cambios.md) — convenciones al modificar código.
- [Modelo de datos](../concepts/modelo-de-datos.md) antes de tocar el esquema.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
