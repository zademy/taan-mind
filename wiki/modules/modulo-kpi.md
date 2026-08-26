---
type: Modulo
title: Módulo KPI
description: Estadísticas de documentos para el panel — dominio kpi con estado, línea de tiempo, tipo MIME y tipo de documento.
tags: [modulo, kpi, estadisticas, dashboard]
---

# Módulo KPI

Panel de estadísticas de documentos con gráficos interactivos (nuxt-charts / Chart.js).

## Superficie

- `server/api/kpi/` — `GET /api/kpi/documents` agrega estadísticas del caché local: estado de procesamiento, línea de tiempo mensual, tipo MIME y tipo de documento.
- Cliente: `app/composables/usePaperless/useStatistics.ts` y componentes de estadísticas en `app/components/`.

## Comportamiento

- Se alimenta del caché local de documentos (SQLite), no de consultas en vivo a Paperless: el costo de agregación queda en la base local.
- Refleja el estado del [procesamiento de documentos](../flows/procesamiento-de-documentos.md): pendientes, procesando, completados y fallos terminales son parte de las métricas de estado.

## Relacionado

- [Módulo paperless](./modulo-paperless.md) — origen del caché.
- [Módulo frontend](./modulo-frontend.md) — páginas y gráficos.

## Fuentes

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
