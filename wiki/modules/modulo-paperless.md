---
type: Modulo
title: Módulo paperless
description: Proxy CRUD hacia Paperless-ngx, caché local de documentos y composables de cliente usePaperless.
tags: [modulo, paperless, proxy, cache]
---

# Módulo paperless

Capa de la app sobre Paperless-ngx: proxy completo de su API, caché local de documentos y lógica de cliente.

## Superficie

- `server/api/paperless/` — proxy CRUD por subdominio: `documents/` (+ `[id]`), `tags/`, `correspondents/`, `document-types/`, `storage-paths/`, `tasks/`.
- `server/utils/paperless.ts` — adaptador de Paperless: descarga de binarios, taxonomía, ASN y actualizaciones.
- `server/api/cache/` (+ `cache/documents/[id]`) — lectura del caché local: `GET /api/cache/documents` devuelve documentos paginados con filtros y orden.
- Cliente: grupo de composables `app/composables/usePaperless/` — `useDocuments`, `useTags`, `useCorrespondents`, `useDocumentTypes`, `useStoragePaths`, `useTasks`, `useStatistics`.
- Páginas: `app/pages/documents/`.

## Comportamiento

- Todas las operaciones Paperless quedan detrás de la API de la app; el cliente nunca habla directo con Paperless.
- El caché local alimenta búsqueda, KPIs y el [procesamiento de documentos](../flows/procesamiento-de-documentos.md); lo llena el [worker de sincronización](../flows/sincronizacion-paperless.md).
- Conexión por `.env` (URL base + token creado por el bootstrap de Compose).

## Relacionado

- [Integración Paperless-ngx](../concepts/integracion-paperless.md)
- [Módulo procesamiento](./modulo-procesamiento.md)
- [Módulo KPI](./modulo-kpi.md)

## Fuentes

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
