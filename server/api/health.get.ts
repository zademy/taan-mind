/**
 * Lightweight liveness endpoint for container health checks.
 *
 * This intentionally avoids external dependencies such as Paperless, Ollama,
 * or AI providers so Docker can distinguish "app process is serving HTTP"
 * from "an upstream integration is temporarily unavailable".
 */
export default defineEventHandler(() => ({
  ok: true,
  service: 'paperless-ui-chat',
  timestamp: new Date().toISOString()
}))
