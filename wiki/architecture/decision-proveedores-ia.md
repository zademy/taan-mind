---
type: Decision
title: Proveedores de IA multi-proveedor con Vercel AI SDK
description: Chat y enriquecimiento sobre Vercel AI SDK con registro de modelos compartido y proveedores dinámicos.
tags: [decision, ia, ai-sdk, streaming]
---

## Contexto

La app necesita conversaciones con streaming y un pipeline de enriquecimiento de documentos que funcione sin sesión de usuario, contra varios proveedores de IA con disponibilidad variable (claves opcionales, Ollama local a veces caído).

## Decisión

Construir el chat sobre **Vercel AI SDK** con un registro de modelos compartido (`shared/utils/models.ts`) que expone proveedores estáticos y dinámicos:

- **Estáticos**: MiniMax, GLM, Anthropic (Claude), OpenAI (GPT), Nova.
- **Dinámicos**: Ollama (descubierto vía `/api/tags`) y OpenRouter (descubierto vía `/api/v1/models`), solo si son alcanzables.

Si Ollama u OpenRouter no están configurados, el selector sigue mostrando los modelos estáticos. Los modelos solo-OCR se excluyen de los selectores de chat y de procesamiento; siguen disponibles para los endpoints de OCR.

## Consecuencias

- Un solo contrato de streaming para todos los proveedores; particularidades por proveedor (p. ej. `reasoning_effort` solo en Nova 2 Lite, summaries de razonamiento en GPT-5) quedan en la capa de adaptación.
- El modelo de enriquecimiento es un ajuste global de la app porque el procesamiento en fondo no corre en sesión de usuario.
- El consumo de tokens se registra por dominio `usage`.

## Relacionado

- [Proveedores de IA](../concepts/proveedores-ia.md) — el concepto de dominio.
- [Chat con streaming](../flows/chat-streaming.md) — el flujo completo.

## Fuentes

- [README.md](../../README.md) — tabla de modelos y notas por proveedor.
- [AGENTS.md](../../AGENTS.md)
