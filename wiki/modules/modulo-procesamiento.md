---
type: Modulo
title: Módulo procesamiento
description: OCR y enriquecimiento en segundo plano — dominios ocr y upload, worker document-processor y el módulo documentProcessingRun.
tags: [modulo, ocr, enriquecimiento, background]
---

Pipeline de OCR y enriquecimiento de documentos en segundo plano.

## Superficie

- `server/plugins/document-processor.ts` — worker de fondo: scheduler que reclama registros y delega runs.
- `server/utils/documentProcessingRun.ts` — orquestación del run completo (con pruebas en `documentProcessingRun.test.ts`).
- `server/utils/documentProcessingSettings.ts` — ajustes del pipeline (límite de intentos, cadencia).
- `server/api/ocr/` — superficie de API del pipeline; `POST /api/ocr/extract` extrae texto de archivos subidos vía Ollama + MuPDF.
- `server/api/upload/` — subida de archivos.
- Helpers: `server/utils/ocr.ts`, `server/utils/ollama.ts`, `server/utils/textCleaner.ts`.
- Tipos: `shared/types/ocr.d.ts`.

## Comportamiento

- Sigue el [flujo de procesamiento de documentos](../flows/procesamiento-de-documentos.md); el vocabulario completo está en [registro de documento](../concepts/registro-de-documento.md).
- La extracción es consciente del MIME: parsers directos, conversión de imágenes, render de PDF (MuPDF) y OCR con Ollama según el caso.
- El worker usa `internalApiAuth` para las APIs internas (véase [workers de fondo](../architecture/decision-workers-fondo.md)).

## Relacionado

- [Módulo paperless](./modulo-paperless.md) — origen y destino de los documentos.
- [Módulo chat](./modulo-chat.md) — el contenido procesado alimenta el contexto documental.

## Fuentes

- [CONTEXT.md](../../CONTEXT.md)
- [AGENTS.md](../../AGENTS.md)
