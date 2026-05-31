/**
 * Device Session Parsing Utilities
 *
 * Parses raw Better Auth session rows and enriches them with
 * browser/OS metadata extracted from the `User-Agent` header.
 * Also provides human-readable labels and session-type detection.
 *
 * @module shared/utils
 */

/**
 * deviceSessions.ts — Utilities for parsing, normalizing, and presenting
 * Better Auth sessions as human-readable device records.
 *
 * Better Auth exposes raw session data (userAgent, ipAddress, timestamps).
 * This module enriches that data with derived fields:
 *   - Parsed browser name and major version
 *   - Parsed OS name and device model
 *   - Device kind (desktop / mobile / tablet / bot / unknown)
 *   - Lucide icon name for the device kind
 *   - Human-readable "last active", "device name", "device description"
 *
 * @module deviceSessions
 * @typicalname createDeviceSession
 *
 * @example
 * ```ts
 * import { createDeviceSession } from '#shared/utils/deviceSessions'
 *
 * const session = await db.select().from(schema.session).where(eq(schema.session.id, id))
 * const device = createDeviceSession({ ...session, isCurrent: true })
 * ```
 */

import { APP_DISPLAY_NAME } from './appMetadata'

export type DeviceKind = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export interface DeviceSessionSource {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  expiresAt: Date | string
  ipAddress?: string | null
  userAgent?: string | null
  userName?: string | null
  userEmail?: string | null
  isCurrent: boolean
}

export interface DeviceSession {
  id: string
  lastActiveAt: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  userName: string | null
  userEmail: string | null
  userLabel: string
  isCurrent: boolean
  deviceKind: DeviceKind
  deviceIcon: string
  deviceName: string
  deviceDescription: string
  applicationName: string
  browserName: string
  browserVersion: string | null
  osName: string
}

export interface DeleteDeviceSessionsResult {
  ok: true
  deletedCount: number
}

interface BrowserInfo {
  name: string
  version: string | null
}

interface OperatingSystemInfo {
  name: string
  model: string | null
}

const UNKNOWN_BROWSER = 'Unknown browser'
const UNKNOWN_OS = 'Unknown OS'

/**
 * Converts a Date or Date-like string to an ISO 8601 string.
 * Falls back to returning the input value unchanged if parsing fails
 * (e.g. invalid dates stored directly in the DB).
 */
function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/**
 * Returns the major (first) version segment of a semver-like string.
 * `null` if the input is null or undefined.
 */
function getMajorVersion(version: string | null): string | null {
  return version?.split('.')[0] ?? null
}

function matchVersion(userAgent: string, pattern: RegExp): string | null {
  return userAgent.match(pattern)?.[1] ?? null
}

/**
 * Extracts the browser name and major version from a User-Agent string.
 *
 * Supports: Edge, Samsung Internet, Opera, Chrome (incl. iOS CriOS),
 * Firefox (incl. iOS FxiOS), Safari, Android WebView.
 * Falls back to "Unknown browser" for unrecognized strings.
 *
 * @param userAgent — raw User-Agent header value (nullable)
 * @returns parsed browser name and major version string
 */
export function parseBrowser(userAgent?: string | null): BrowserInfo {
  const value = userAgent ?? ''
  if (!value) return { name: UNKNOWN_BROWSER, version: null }

  if (/EdgA?\//i.test(value)) {
    return { name: 'Edge', version: getMajorVersion(matchVersion(value, /EdgA?\/([\d.]+)/i)) }
  }

  if (/SamsungBrowser\//i.test(value)) {
    return {
      name: 'Samsung Internet',
      version: getMajorVersion(matchVersion(value, /SamsungBrowser\/([\d.]+)/i))
    }
  }

  if (/OPR\//i.test(value)) {
    return { name: 'Opera', version: getMajorVersion(matchVersion(value, /OPR\/([\d.]+)/i)) }
  }

  if (/CriOS\//i.test(value)) {
    return { name: 'Chrome', version: getMajorVersion(matchVersion(value, /CriOS\/([\d.]+)/i)) }
  }

  if (/Chrome\//i.test(value)) {
    return { name: 'Chrome', version: getMajorVersion(matchVersion(value, /Chrome\/([\d.]+)/i)) }
  }

  if (/FxiOS\//i.test(value)) {
    return { name: 'Firefox', version: getMajorVersion(matchVersion(value, /FxiOS\/([\d.]+)/i)) }
  }

  if (/Firefox\//i.test(value)) {
    return { name: 'Firefox', version: getMajorVersion(matchVersion(value, /Firefox\/([\d.]+)/i)) }
  }

  if (/Version\/[\d.]+.*Safari\//i.test(value)) {
    return { name: 'Safari', version: getMajorVersion(matchVersion(value, /Version\/([\d.]+)/i)) }
  }

  if (/wv\)|; wv\)/i.test(value)) {
    return {
      name: 'Android WebView',
      version: getMajorVersion(matchVersion(value, /Version\/([\d.]+)/i))
    }
  }

  return { name: UNKNOWN_BROWSER, version: null }
}

function cleanAndroidModel(value: string | null): string | null {
  if (!value) return null

  const model = value
    .replace(/\s+Build\/.*$/i, '')
    .replace(/\s+wv$/i, '')
    .trim()

  if (!model || /^K$/i.test(model)) return null
  return model
}

/**
 * Extracts the operating system name and device model from a User-Agent string.
 *
 * Handles: Android (with optional model extraction), iOS/iPadOS, macOS,
 * Windows, and Linux. Desktop UAs without a specific OS name fall back
 * to "Unknown OS".
 *
 * @param userAgent — raw User-Agent header value (nullable)
 * @returns parsed OS name and optional device model
 */
export function parseOperatingSystem(userAgent?: string | null): OperatingSystemInfo {
  const value = userAgent ?? ''
  if (!value) return { name: UNKNOWN_OS, model: null }

  if (/Android/i.test(value)) {
    const model = cleanAndroidModel(value.match(/Android\s[\d.]+;\s?([^;)]+)/i)?.[1] ?? null)
    return { name: 'Android', model }
  }

  if (/iPad/i.test(value)) return { name: 'iPadOS', model: 'iPad' }
  if (/iPhone/i.test(value)) return { name: 'iOS', model: 'iPhone' }
  if (/Mac OS X|Macintosh/i.test(value)) return { name: 'macOS', model: null }
  if (/Windows NT/i.test(value)) return { name: 'Windows', model: null }
  if (/Linux/i.test(value)) return { name: 'Linux', model: null }

  return { name: UNKNOWN_OS, model: null }
}

/**
 * Classifies the device form factor from a User-Agent string.
 *
 * Classification order: bot → tablet → mobile → desktop → unknown.
 * A UA matching both mobile and desktop patterns returns "mobile"
 * since the mobile regex is more specific (Mobi/Android/iPhone).
 *
 * @param userAgent — raw User-Agent header value (nullable)
 */
export function getDeviceKind(userAgent?: string | null): DeviceKind {
  const value = userAgent ?? ''
  if (!value) return 'unknown'
  if (/bot|crawler|spider|slurp/i.test(value)) return 'bot'
  if (/iPad|Tablet/i.test(value)) return 'tablet'
  if (/Mobi|Android|iPhone/i.test(value)) return 'mobile'
  if (/Windows NT|Macintosh|Mac OS X|Linux/i.test(value)) return 'desktop'
  return 'unknown'
}

/**
 * Returns the Lucide icon class name for a given device kind.
 * Used in the DevicesSettingsSection table cell template.
 */
export function getDeviceIcon(kind: DeviceKind): string {
  const icons: Record<DeviceKind, string> = {
    desktop: 'i-lucide-monitor',
    mobile: 'i-lucide-smartphone',
    tablet: 'i-lucide-tablet',
    bot: 'i-lucide-bot',
    unknown: 'i-lucide-circle-help'
  }

  return icons[kind]
}

/**
 * Transforms a raw Better Auth session record into a enriched device session
 * ready for UI display.
 *
 * @param source — raw session row from the DB (includes userName, userEmail,
 *   isCurrent flag, and User-Agent).
 *
 * @example
 * ```ts
 * const device = createDeviceSession({
 *   id: session.id,
 *   createdAt: session.createdAt,
 *   updatedAt: session.updatedAt,
 *   expiresAt: session.expiresAt,
 *   ipAddress: session.ipAddress,
 *   userAgent: session.userAgent,
 *   userName: user.name,
 *   userEmail: user.email,
 *   isCurrent: session.id === currentSessionId
 * })
 * ```
 */
export function createDeviceSession(source: DeviceSessionSource): DeviceSession {
  const browser = parseBrowser(source.userAgent)
  const os = parseOperatingSystem(source.userAgent)
  const deviceKind = getDeviceKind(source.userAgent)
  const browserLabel =
    browser.name === UNKNOWN_BROWSER
      ? UNKNOWN_BROWSER
      : browser.version
        ? `${browser.name} ${browser.version}`
        : browser.name
  const deviceName =
    os.model ?? (browser.name === UNKNOWN_BROWSER ? 'Unknown device' : browser.name)
  const deviceDescription = os.model ? `${browserLabel} · ${os.name}` : os.name
  const userLabel = source.userName || source.userEmail || 'Unknown user'

  return {
    id: source.id,
    lastActiveAt: toIsoString(source.updatedAt),
    createdAt: toIsoString(source.createdAt),
    expiresAt: toIsoString(source.expiresAt),
    ipAddress: source.ipAddress ?? null,
    userAgent: source.userAgent ?? null,
    userName: source.userName ?? null,
    userEmail: source.userEmail ?? null,
    userLabel,
    isCurrent: source.isCurrent,
    deviceKind,
    deviceIcon: getDeviceIcon(deviceKind),
    deviceName,
    deviceDescription,
    applicationName: APP_DISPLAY_NAME,
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name
  }
}
