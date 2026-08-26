---
type: Concepto
title: Flujo OCR
description: Pipeline de OCR en segundo plano con Ollama y MuPDF, orquestado por el worker document-processor.
tags: [ocr, ollama, mupdf, background]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Flujo OCR

Los documentos pasan por un pipeline de **OCR en segundo plano** que combina **Ollama** y **MuPDF**, junto con extracción de metadatos asistida por IA.

## Piezas

- Plugin de servidor `document-processor` — worker que procesa documentos pendientes.
- Dominio `ocr` en `server/api/` — superficie de API del pipeline.
- Dominio `paperless` — origen de los documentos; véase [Integración Paperless-ngx](./integracion-paperless.md).

## Punto crítico

El worker `document-processor` llama a APIs internas mediante `internalApiAuth`. **Conservar esa vía de autenticación** al modificar los workers de fondo (`paperless-sync.ts`, `document-processor.ts`); es una de las [gotchas](../AGENTS.md) documentadas del repositorio.

## Relacionado

- [Proveedores de IA](./proveedores-ia.md) — Ollama como proveedor local.
- [Arquitectura](./arquitectura.md)

## Fuentes

- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
