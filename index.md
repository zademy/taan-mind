---
okf_version: "0.2"
---

# Base de conocimientos de Taan Mind

Wiki del proyecto **Taan Mind** (`taan-mind`): aplicación full-stack Nuxt 4 que integra un chat de IA multi-proveedor con streaming con la gestión documental de Paperless-ngx — proxy CRUD, OCR en segundo plano (Ollama + MuPDF), extracción de metadatos con IA, panel de KPIs y chat compartible.

Base conforme a [Open Knowledge Format](./concepts/como-empezar.md) v0.2: conceptos en `concepts/`, un concepto por archivo, relaciones mediante enlaces markdown estándar.

## Mapa de conceptos

- [Cómo empezar](./concepts/como-empezar.md) — puesta en marcha, comandos y puerta de verificación.
- [Arquitectura](./concepts/arquitectura.md) — capas `app/`, `server/`, `shared/` y convenciones del código.
- [Proveedores de IA](./concepts/proveedores-ia.md) — chat multi-proveedor con Vercel AI SDK.
- [Integración Paperless-ngx](./concepts/integracion-paperless.md) — proxy CRUD, sincronización y extracción de metadatos.
- [Flujo OCR](./concepts/flujo-ocr.md) — procesamiento de documentos en segundo plano.
- [Autenticación](./concepts/autenticacion.md) — Better Auth, sesiones y bootstrap del admin.
- [Modelo de datos](./concepts/modelo-de-datos.md) — Drizzle ORM sobre SQLite y migraciones.

## Fuentes

- [AGENTS.md](./AGENTS.md) — contexto de ingeniería del repositorio.
- [README.md](./README.md) — arquitectura y diagramas.
