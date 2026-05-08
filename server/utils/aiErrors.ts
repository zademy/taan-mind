/**
 * @file AI provider error normalization helpers.
 *
 * AI SDK provider errors often wrap the useful upstream response inside retry
 * errors. These helpers extract the provider-facing message without exposing
 * request bodies, user ids, or full internal stack traces.
 */

const DEFAULT_AI_ERROR_MESSAGE =
  'The selected AI provider returned an error. Please try again or select another model.'
const MAX_AI_ERROR_MESSAGE_LENGTH = 700

/**
 * Extracts a user-facing error message from AI SDK/OpenAI-compatible errors.
 *
 * @param error - Unknown error thrown by AI SDK/provider calls.
 * @param fallback - Message used when no useful provider message is available.
 * @returns Safe, concise message suitable for chat UI/toasts.
 */
export function getAIUserErrorMessage(error: unknown, fallback = DEFAULT_AI_ERROR_MESSAGE): string {
  const specificError = getMostSpecificError(error)
  const statusCode =
    getNumberField(specificError, 'statusCode') ?? getNumberField(error, 'statusCode')
  const payload = getErrorPayload(specificError) ?? getErrorPayload(error)
  const providerName = getNestedString(payload, ['error', 'metadata', 'provider_name'])
  const rawProviderMessage = getNestedString(payload, ['error', 'metadata', 'raw'])
  const apiMessage = getNestedString(payload, ['error', 'message'])
  const directMessage = getStringField(specificError, 'message') ?? getStringField(error, 'message')

  const baseMessage = rawProviderMessage || apiMessage || directMessage || fallback
  return truncateMessage(formatStatusMessage(baseMessage, statusCode, providerName))
}

function getMostSpecificError(error: unknown): unknown {
  const record = asRecord(error)

  if (!record) {
    return error
  }

  if (record.lastError) {
    return getMostSpecificError(record.lastError)
  }

  if (record.cause && record.cause !== error) {
    return getMostSpecificError(record.cause)
  }

  return error
}

function getErrorPayload(error: unknown): Record<string, unknown> | undefined {
  const record = asRecord(error)

  if (!record) {
    return undefined
  }

  return parsePayload(record.responseBody) ?? parsePayload(record.data)
}

function parsePayload(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return undefined
    }
  }

  return asRecord(value)
}

function formatStatusMessage(message: string, statusCode?: number, providerName?: string): string {
  const normalizedMessage = normalizeWhitespace(message)
  const providerPrefix = providerName ? `${providerName} ` : ''

  if (statusCode === 429) {
    return `${providerPrefix}rate limit: ${normalizedMessage}`
  }

  if (statusCode === 402) {
    return `Insufficient OpenRouter credits: ${normalizedMessage}`
  }

  if (statusCode === 503) {
    return `${providerPrefix}provider unavailable: ${normalizedMessage}`
  }

  if (providerName) {
    return `${providerName}: ${normalizedMessage}`
  }

  return normalizedMessage
}

function getNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value

  for (const key of path) {
    const record = asRecord(current)

    if (!record || !(key in record)) {
      return undefined
    }

    current = record[key]
  }

  return typeof current === 'string' && current.trim() ? current.trim() : undefined
}

function getStringField(value: unknown, field: string): string | undefined {
  const record = asRecord(value)
  const fieldValue = record?.[field]
  return typeof fieldValue === 'string' && fieldValue.trim() ? fieldValue.trim() : undefined
}

function getNumberField(value: unknown, field: string): number | undefined {
  const record = asRecord(value)
  const fieldValue = record?.[field]
  return typeof fieldValue === 'number' ? fieldValue : undefined
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateMessage(value: string): string {
  if (value.length <= MAX_AI_ERROR_MESSAGE_LENGTH) {
    return value
  }

  return `${value.slice(0, MAX_AI_ERROR_MESSAGE_LENGTH - 1).trimEnd()}…`
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return undefined
}
