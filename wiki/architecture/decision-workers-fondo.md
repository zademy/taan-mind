---
type: Decision
title: Workers de fondo como plugins Nitro con internalApiAuth
description: paperless-sync y document-processor corren como plugins de servidor y llaman a las APIs internas mediante internalApiAuth.
tags: [decision, workers, nitro, background]
---

## Contexto

La sincronización con Paperless y el procesamiento OCR/enriquecimiento deben ocurrir en segundo plano, sin sesión de usuario, reutilizando la misma lógica de las rutas de API en vez de duplicarla.

## Decisión

Implementar los workers como **plugins de servidor Nitro**:

- `server/plugins/paperless-sync.ts` — importación periódica de metadatos de documentos de Paperless al caché local.
- `server/plugins/document-processor.ts` — reclama registros de procesamiento y ejecuta la secuencia completa de [enriquecimiento](../flows/procesamiento-de-documentos.md).

Ambos llaman a las APIs internas de la propia app a través del helper `server/utils/internalApiAuth.ts`, que autentica las peticiones del worker contra el middleware `server/middleware/auth.ts` sin credenciales de usuario.

## Consecuencias

- **Conservar la vía `internalApiAuth`** al tocar los workers: es una de las gotchas documentadas del repositorio; romperla deja a los workers fuera de las APIs internas.
- El orquestador (`documentProcessingRun` en `server/utils/`) no posee OCR, enriquecimiento ni mutación de Paperless: solo temporiza, reclama y delega.
- Los workers comparten el mismo contrato Zod y las mismas formas de respuesta que el resto de los handlers.

## Relacionado

- [Sincronización con Paperless](../flows/sincronizacion-paperless.md)
- [Registro de documento](../concepts/registro-de-documento.md)

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [CONTEXT.md](../../CONTEXT.md)
