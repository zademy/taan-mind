Crea una base de conocimientos OKF v0.2 de este proyecto como subárbol `wiki/`, siguiendo la skill local `open-knowledge` (contrato de herramientas: TODA escritura/edición de `.md` se hace con las herramientas MCP de OpenKnowledge, nunca con herramientas nativas de archivo) y la skill `okf-knowledge-base` (semántica OKF). Todo el contenido en **español**, archivos en **kebab-case**.

## 1. Investiga primero

Antes de crear nada, entiende el proyecto real: README, AGENTS.md/CLAUDE.md/CONTEXT.md, docs/, manifiesto de paquete (package.json/pom.xml/etc.), árbol de código fuente, pruebas y configuración de despliegue. **No inventes nada**: cada afirmación debe poder citar un archivo real del repositorio.

## 2. Estructura fija

```text
wiki/
  OVERVIEW.md          # type: Vision — qué es el proyecto, stack, cómo navegar el wiki
  index.md             # GENERADO por el plugin okf — nunca editar a mano
  log.md               # registro autorado, entradas más recientes primero: ## YYYY-MM-DD: resumen
  architecture/
    index.md           # generado
    vista-general.md   # capas, runtime y convenciones del código
    decision-*.md      # una por decisión clave: contexto, decisión, consecuencias, fuentes
  concepts/
    index.md           # generado
    *.md               # vocabulario del dominio — un concepto por archivo
  flows/
    index.md           # generado
    *.md               # flujos paso a paso con diagrama mermaid
  guides/
    index.md           # generado
    *.md               # guías prácticas: requisitos, pasos, verificación, fuentes
  modules/
    index.md           # generado
    modulo-*.md        # un doc por módulo: responsabilidad, superficie, comportamiento, fuentes
```

Ajusta el número de docs al proyecto: mejor pocos y verdaderos que muchos y especulativos.

## 3. Convenciones de escritura

- Frontmatter en cada doc: `type` (vocabulario abierto en español capitalizado: `Vision`, `Concepto`, `Flujo`, `Guia`, `Modulo`, `Decision`), `title`, `description` (una línea), `tags` (lista).
- El título vive **solo** en frontmatter; el cuerpo empieza con un párrafo introductorio, **sin `# H1`** (evita MD025).
- Secciones con `##`; listas rodeadas de líneas en blanco; un solo H1 lógico por doc.
- Enlaces Markdown relativos entre docs del wiki; sección `## Fuentes` al final enlazando archivos reales del repo (README, AGENTS.md, CONTEXT.md, docs/…).
- Flujos: pasos numerados con negrita en cada paso + diagrama `mermaid` + sección de puntos de atención.
- Frontmatter descriptivo en cada carpeta (`title`, `description`, `tags`) y, si el proyecto lo permite, plantillas por carpeta (`decision`, `concepto`, `flujo`, `guia`, `modulo`).
- `index.md` es propiedad de la máquina: si el plugin `okf` tiene `generate: index`, déjalo regenerarlos; jamás los edites.
- Añade entrada truthful y datada en `wiki/log.md` tras cambios duraderos.

## 4. Verificación final

- Ejecuta la auditoría (`audit`) acotada a `wiki/`: debe terminar con **0 problemas** (markdownlint, frontmatter, okf, links). Corrige todo lo tuyo.
- Las advertencias sobre archivos raíz del repo (README, CHANGELOG, etc.) están fuera del bundle: **no los toques**.
- No recrees carpetas que el usuario haya borrado a propósito.

## 5. Cierre

- Guarda un resumen de sesión y los descubrimientos no obvios en memoria persistente.
- Reporta al usuario solo: estructura creada, conteo de documentos y resultado de la auditoría.
