---
type: Concepto
title: Integración Paperless-ngx
description: Proxy CRUD hacia Paperless-ngx, sincronización en segundo plano, extracción de metadatos con IA y panel de KPIs.
tags: [paperless, integracion, kpi]
---

# Integración Paperless-ngx

Taan Mind actúa como capa sobre una instancia de **Paperless-ngx** para gestión documental.

## Capacidades

- **Proxy CRUD** de documentos y datos a través del dominio `paperless` de `server/api/` (documentos, etiquetas, corresponsales, tipos, rutas de almacenamiento, tareas).
- **Sincronización en segundo plano** mediante el worker `paperless-sync` (plugin de servidor); véase el [flujo de sincronización](../flows/sincronizacion-paperless.md).
- **Extracción de metadatos con IA** sobre los documentos sincronizados; véase el [procesamiento de documentos](../flows/procesamiento-de-documentos.md).
- **Panel de KPIs** alimentado por el dominio `kpi`.
- **Chat compartible** mediante el dominio `chats`.

En el cliente, la lógica de dominio vive en el grupo de composables `app/composables/usePaperless/`.

## Puntos de atención

- La conexión (URL base + token de API) se configura en `.env`; véase [Cómo empezar](../guides/como-empezar.md) y [Despliegue con Docker](../guides/despliegue-docker.md).
- El worker `paperless-sync` llama a APIs internas a través de `internalApiAuth`: conservar esa vía al tocarlo (véase [workers de fondo](../architecture/decision-workers-fondo.md)).
- Paperless sigue siendo la fuente de verdad documental; la app cachea y enriquece.

## Relacionado

- [Vista general de arquitectura](../architecture/vista-general.md)
- [Autenticación](./autenticacion.md)
- [Módulo paperless](../modules/modulo-paperless.md)

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
