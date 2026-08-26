# Registro de cambios

## 2026-08-26: Wiki OKF completo

- Reestructurada la base a `wiki/` con carpetas fijas: `architecture/`, `concepts/`, `flows/`, `guides/`, `modules/`, más `OVERVIEW.md`, `index.md` y `log.md` propios.
- Migrados los conceptos previos; `arquitectura` y `flujo-ocr` quedaron absorbidos por `architecture/vista-general` y `flows/procesamiento-de-documentos`; `como-empezar` pasó a guías.
- Añadidos: 4 decisiones de arquitectura, vocabulario de procesamiento (`registro-de-documento`), 3 flujos con diagramas mermaid, guías de desarrollo y despliegue, y 7 docs de módulos.
- Creadas plantillas por carpeta (`decision`, `concepto`, `flujo`, `guia`, `modulo`) y frontmatter descriptivo en cada carpeta.
- Eliminada la carpeta `concepts/` raíz tras la migración.

## 2026-08-26: Base OKF inicial

- Creada la estructura OKF v0.2: `index.md`, `log.md` y carpeta `concepts/` con plantilla `concepto`.
- Añadidos los conceptos: `como-empezar`, `arquitectura`, `proveedores-ia`, `integracion-paperless`, `flujo-ocr`, `autenticacion` y `modelo-de-datos`, derivados de `AGENTS.md` y `README.md`.
