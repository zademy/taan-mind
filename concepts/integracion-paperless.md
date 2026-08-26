---
type: Concepto
title: Integración Paperless-ngx
description: Proxy CRUD hacia Paperless-ngx, sincronización en segundo plano, extracción de metadatos con IA y panel de KPIs.
tags: [paperless, integracion, kpi]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Integración Paperless-ngx

Taan Mind actúa como capa sobre una instancia de **Paperless-ngx** para gestión documental.

## Capacidades

- **Proxy CRUD** de documentos y datos a través del dominio `paperless` de `server/api/`.
- **Sincronización en segundo plano** mediante el worker `paperless-sync` (plugin de servidor).
- **Extracción de metadatos con IA** sobre los documentos sincronizados.
- **Panel de KPIs** alimentado por el dominio `kpi`.
- **Chat compartible** mediante el dominio `chats`.

En el cliente, la lógica de dominio vive en el grupo de composables `app/composables/usePaperless/`.

## Puntos de atención

- La conexión se configura en `.env` (véase [Cómo empezar](./como-empezar.md)).
- El worker `paperless-sync` llama a APIs internas a través de `internalApiAuth`: conservar esa vía de autenticación al tocarlo (véase [Flujo OCR](./flujo-ocr.md)).

## Relacionado

- [Arquitectura](./arquitectura.md)
- [Autenticación](./autenticacion.md)

## Fuentes

- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
