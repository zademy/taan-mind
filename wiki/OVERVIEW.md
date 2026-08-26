---
type: Vision
title: Visión general
description: Qué es Taan Mind — capacidades, stack y cómo navegar el wiki.
tags: [vision, overview, okf]
---

**Taan Mind** (`taan-mind`) es un espacio de trabajo de IA centrado en la privacidad para chat, OCR automático, flujos de documentos y paneles de KPI, construido con **Nuxt 4**. Es un acompañante de [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx): sincroniza documentos, les aplica OCR en segundo plano (Ollama + MuPDF), enriquece sus metadatos con IA y permite conversar con contexto documental.

## Capacidades

- **Chat de IA con streaming** — múltiples proveedores (MiniMax, GLM, Anthropic, OpenAI, OpenRouter, Nova y modelos de Ollama) con personalidades predefinidas.
- **Integración Paperless-ngx** — proxy CRUD completo de documentos, etiquetas, corresponsales, tipos y rutas de almacenamiento.
- **OCR automático** — pipeline de procesamiento en segundo plano con Ollama y MuPDF.
- **Extracción de metadatos con IA** — sugiere títulos, etiquetas, corresponsales y tipos de documento.
- **Panel de KPIs** — estadísticas de documentos con gráficos interactivos (estado, línea de tiempo, tipo MIME, tipo de documento).
- **Contexto documental** — inyecta contenido de documentos (procesado por OCR/IA) como contexto en los chats.
- **Chat compartible** — enlaces de solo lectura revocables con vista de transcripción mínima.
- **Herramientas de IA** — generación de gráficos, pronósticos del clima y búsqueda web.
- **Autenticación** — Better Auth con email/contraseña, sesiones en SQLite y bootstrap del admin en la primera ejecución.
- **Docker** — Dockerfile multi-stage con runtime endurecido y stack completo de Paperless-ngx vía Compose.

## Stack

| Tecnología | Propósito |
| --- | --- |
| Nuxt 4 (Vue 3, TypeScript) | Framework full-stack con rutas Nitro |
| Nuxt UI 4 + Tailwind CSS 4 | Componentes y estilos (config CSS-first) |
| Vercel AI SDK | Integración de IA con streaming |
| Drizzle ORM + SQLite (libsql) | Persistencia type-safe |
| Better Auth | Autenticación email/contraseña |
| Ollama + MuPDF | OCR local y procesamiento de PDF/imágenes |
| nuxt-charts | Visualizaciones del panel de KPIs |
| Docker / Compose | Despliegue y stack con Paperless-ngx |

## Cómo navegar el wiki

- [Vista general de arquitectura](./architecture/vista-general.md) — capas, runtime y convenciones.
- [Conceptos](./index.md#conceptos) — vocabulario del dominio.
- [Flujos](./index.md#flujos) — procesos paso a paso.
- [Guías](./index.md#guias) — cómo empezar, desarrollar cambios y desplegar.
- [Módulos](./index.md#modulos) — un doc por módulo o componente.

## Fuentes

- [README.md](../README.md) — características, arquitectura y modelos de IA.
- [AGENTS.md](../AGENTS.md) — contexto de ingeniería del repositorio.
