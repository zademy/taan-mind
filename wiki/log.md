# Registro del wiki

## 2026-08-26: Reparado flujo de procesamiento de documentos

- Eliminado el contenido triplicado en `flows/procesamiento-de-documentos.md` (escritura interrumpida de la sesión anterior) y retirado el H1 redundante para seguir el patrón del resto del wiki.
- Auditoría del wiki sin problemas de lint, frontmatter OKF ni enlaces rotos.

## 2026-08-26: Wiki OKF reconstruido desde cero

- Reescrita desde cero la estructura wiki OKF v0.2 con carpetas fijas: `architecture/`, `concepts/`, `flows/`, `guides/`, `modules/`, más `OVERVIEW.md`, `index.md` y `log.md`.
- Contenido: vista de arquitectura + 4 decisiones, 5 conceptos (incluido el vocabulario de procesamiento `registro-de-documento`), 3 flujos con diagramas mermaid, 3 guías y 7 docs de módulos.
- Plantillas por carpeta: `decision`, `concepto`, `flujo`, `guia`, `modulo`; frontmatter descriptivo en cada carpeta.
