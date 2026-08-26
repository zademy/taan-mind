---
type: Concepto
title: Proveedores de IA
description: Chat multi-proveedor con streaming mediante Vercel AI SDK — MiniMax, GLM, Anthropic, OpenAI, OpenRouter, Nova y Ollama.
tags: [ia, streaming, ai-sdk]
---

El chat de Taan Mind se construye sobre **Vercel AI SDK** con streaming multi-proveedor.

## Proveedores

- **Estáticos**: MiniMax, GLM, Anthropic (Claude), OpenAI (GPT), Nova.
- **Dinámicos**: Ollama (modelos locales descubiertos) y OpenRouter (catálogo descubierto).

Las claves de cada proveedor y la URL de Ollama se configuran en `.env` (copiado de `.env.example`); véase [Cómo empezar](../guides/como-empezar.md). Si un proveedor dinámico no está configurado o no responde, el selector sigue mostrando los modelos estáticos.

## Puntos en el código

- Registro de modelos compartido: `shared/utils/models.ts`.
- Las rutas de chat viven bajo el dominio `chats` de `server/api/`, junto a `usage` (consumo) y `personalities` (personalidades), dentro de la [vista general de arquitectura](../architecture/vista-general.md).
- Los tipos compartidos con el cliente están en `shared/types/`.

## Relacionado

- [Decisión: proveedores de IA](../architecture/decision-proveedores-ia.md) — por qué un registro compartido.
- [Integración Paperless-ngx](./integracion-paperless.md) — la IA también alimenta la extracción de metadatos.
- [Chat con streaming](../flows/chat-streaming.md) — el flujo completo.

## Fuentes

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
