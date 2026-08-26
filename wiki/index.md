# Mapa del wiki

Wiki conforme a [Open Knowledge Format](https://openknowledge.ai) v0.2. Empieza por [OVERVIEW](./OVERVIEW.md) para una visión general del proyecto.

## Arquitectura

- [Vista general](./architecture/vista-general.md) — capas `app/`, `server/`, `shared/` y runtime.
- [Decisión: proveedores de IA](./architecture/decision-proveedores-ia.md) — Vercel AI SDK multi-proveedor.
- [Decisión: SQLite + Drizzle](./architecture/decision-sqlite-drizzle.md) — persistencia y migraciones generadas.
- [Decisión: workers de fondo](./architecture/decision-workers-fondo.md) — plugins Nitro y `internalApiAuth`.
- [Decisión: autenticación](./architecture/decision-autenticacion.md) — Better Auth y bootstrap del admin.

## Conceptos

- [Proveedores de IA](./concepts/proveedores-ia.md)
- [Integración Paperless-ngx](./concepts/integracion-paperless.md)
- [Autenticación](./concepts/autenticacion.md)
- [Modelo de datos](./concepts/modelo-de-datos.md)
- [Registro de documento](./concepts/registro-de-documento.md) — vocabulario del procesamiento.

## Flujos

- [Procesamiento de documentos](./flows/procesamiento-de-documentos.md) — OCR y enriquecimiento con IA.
- [Sincronización con Paperless](./flows/sincronizacion-paperless.md) — importación periódica al caché local.
- [Chat con streaming](./flows/chat-streaming.md) — de mensaje a respuesta persistida y compartible.

## Guías

- [Cómo empezar](./guides/como-empezar.md) — puesta en marcha del entorno.
- [Desarrollo de cambios](./guides/desarrollo-de-cambios.md) — convenciones y puerta de verificación.
- [Despliegue con Docker](./guides/despliegue-docker.md) — stack completo con Paperless-ngx.

## Módulos

- [Módulo chat](./modules/modulo-chat.md)
- [Módulo paperless](./modules/modulo-paperless.md)
- [Módulo procesamiento](./modules/modulo-procesamiento.md)
- [Módulo KPI](./modules/modulo-kpi.md)
- [Módulo configuración](./modules/modulo-configuracion.md)
- [Módulo proyectos](./modules/modulo-proyectos.md)
- [Módulo frontend](./modules/modulo-frontend.md)
