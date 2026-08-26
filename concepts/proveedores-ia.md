---
type: Concepto
title: Proveedores de IA
description: Chat multi-proveedor con streaming mediante Vercel AI SDK — MiniMax, GLM, Anthropic, OpenAI, OpenRouter, Nova y Ollama.
tags: [ia, streaming, ai-sdk]
generated:
  by: process:opencode
  at: 2026-08-26
---

# Proveedores de IA

El chat de Taan Mind se construye sobre **Vercel AI SDK** con streaming multi-proveedor.

## Proveedores

- MiniMax
- GLM
- Anthropic
- OpenAI
- OpenRouter
- Nova
- Ollama

Las claves de cada proveedor y la URL de Ollama se configuran en `.env` (copiado de `.env.example`); véase [Cómo empezar](./como-empezar.md).

## Puntos en el código

- Las rutas de chat viven bajo el dominio `chats` de `server/api/`, junto a `usage` (consumo) y `personalities` (personalidades), dentro de la [arquitectura](./arquitectura.md) general.
- Los tipos compartidos con el cliente están en `shared/types/`.

## Relacionado

- [Integración Paperless-ngx](./integracion-paperless.md) — la IA también alimenta la extracción de metadatos.
- [Flujo OCR](./flujo-ocr.md) — Ollama participa del pipeline de OCR.

## Fuentes

- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
