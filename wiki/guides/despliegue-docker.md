---
type: Guia
title: Despliegue con Docker
description: Stack completo vía Compose — app, Paperless-ngx (PostgreSQL, Redis, Tika, Gotenberg), bootstrap de token y endurecimiento del contenedor.
tags: [guia, docker, compose, despliegue]
---

# Despliegue con Docker

Cómo levantar Taan Mind junto a su stack de Paperless-ngx con `docker-compose.yml`.

## Requisitos previos

- Docker + Compose.
- `.env` con secretos y credenciales iniciales: `BETTER_AUTH_SECRET` (obligatorio), `NUXT_PAPERLESS_API_TOKEN` y usuario/contraseña de bootstrap de Paperless.
- Ollama accesible desde el host (u otro proveedor de IA con sus claves).

## Servicios del stack

| Servicio | Rol |
| --- | --- |
| `app` | Taan Mind (imagen GHCR `ghcr.io/zademy/taan-mind`) en el puerto 3000; contenedor endurecido: read-only, `cap_drop ALL`, `no-new-privileges`, tmpfs en `/tmp`, healthcheck contra `/api/health` |
| `webserver` | Paperless-ngx 3.0.5 en el puerto 8000 |
| `db` / `broker` | PostgreSQL 18 y Redis 8 para Paperless (red interna `paperless_backend`) |
| `gotenberg` / `tika` | Conversión a PDF y extracción de texto de Paperless |
| `paperless-bootstrap` | Contenedor one-shot que crea el usuario y token de API de Paperless a partir de `NUXT_PAPERLESS_API_TOKEN`; la `app` espera a que termine con éxito |

## Pasos

1. Copia `.env.example` a `.env` y configura secretos y credenciales iniciales.
2. `docker compose up -d` — arrastra la imagen publicada y arranca todo el stack.
3. Verifica: `docker compose logs -f app` y comprueba que `http://localhost:3000/api/health` responde; Paperless en `http://localhost:8000`.
4. Tras el arranque inicial, elimina el contenedor de bootstrap ya completado si quieres limpiar.

## Notas

- **Etiquetas**: las imágenes de GHCR omiten la `v` inicial de los tags de release de Git.
- **Redes**: `app` (aislada), `paperless_frontend` (app ↔ webserver vía DNS `webserver:8000`), `paperless_backend` (interna, sin salida a internet).
- **Volúmenes**: `app_data` persiste la base SQLite de la app; `paperlessia_*` los datos de Paperless.
- **Ollama**: la app lo alcanza en el host vía `host.docker.internal:11434` (configurable con `NUXT_OLLAMA_BASE_URL`); el modelo por defecto para análisis de documentos es `glm-ocr:latest`.
- **Solo imagen**: también puedes correr la app sin Compose con `docker run` y las variables requeridas (`BETTER_AUTH_SECRET`, URL de Paperless, proveedor de IA).
- El entrypoint del contenedor ejecuta las migraciones de base de datos automáticamente.

## Verificación

- Healthchecks en verde para `app`, `webserver`, `db` y `broker`.
- `PAPERLESS_SECRET_KEY` del compose es de desarrollo: cámbiala y usa Docker secrets o vault en producción.

## Relacionado

- [Decisión: autenticación](../architecture/decision-autenticacion.md) — `BETTER_AUTH_*`.
- [Integración Paperless-ngx](../concepts/integracion-paperless.md) — token y conexión.
- [Cómo empezar](./como-empezar.md) — entorno de desarrollo.

## Fuentes

- [docker-compose.yml](../../docker-compose.yml)
- [README.md](../../README.md)
