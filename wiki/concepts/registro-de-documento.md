---
type: Concepto
title: Registro de documento
description: Vocabulario del procesamiento documental — registro de procesamiento, run, scheduler, claim, fallo terminal y adaptador Paperless.
tags: [procesamiento, vocabulario, dominio]
---

Vocabulario del dominio de procesamiento documental, extraído del contexto de dominio del repositorio.

## Términos

- **Documento de Paperless** — documento gestionado por Paperless-ngx y reflejado en Taan Mind para búsqueda, selección, estado de OCR y enriquecimiento con IA.
- **Registro de procesamiento** — estado local de Taan Mind para un documento de Paperless: contenido OCR, estado de procesamiento, intentos y metadatos extraídos.
- **Run de procesamiento** — un intento completo de enriquecer un registro reclamado: descarga el documento, extrae texto, formatea contenido, extrae metadatos, actualiza campos vacíos de Paperless, registra el uso de IA y transiciona el estado local.
- **Scheduler** — control de temporización y concurrencia en segundo plano que reclama como máximo un registro elegible y delega un run. No posee OCR, enriquecimiento, mutación de Paperless ni política de estado.
- **Registro reclamado** — el registro más antiguo elegible tras pasar de pendiente o recuperable a `processing` e incrementar su contador de intentos.
- **Modelo de enriquecimiento** — modelo de lenguaje global de la app seleccionado para formateo de contenido y extracción de metadatos; es global porque el procesamiento no corre en sesión de usuario.
- **Fallo terminal** — registro que agotó el límite de intentos configurado y no volverá a seleccionarse sin un reset explícito.

## Integraciones

- **Adaptador Paperless** — la integración concreta con Paperless-ngx para descarga de documentos, búsqueda/creación de taxonomía, asignación de ASN y actualizaciones. Es el único adaptador de gestión documental en producción.
- **Pipeline OCR** — extracción de texto consciente del MIME usando parsers directos, conversión de imágenes, render de PDF y OCR con Ollama según el documento de origen.

## Relacionado

- [Procesamiento de documentos](../flows/procesamiento-de-documentos.md) — el run paso a paso.
- [Workers de fondo](../architecture/decision-workers-fondo.md) — quién orquesta.

## Fuentes

- [CONTEXT.md](../../CONTEXT.md) — contexto de dominio del repositorio.
- [AGENTS.md](../../AGENTS.md)
