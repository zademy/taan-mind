/**
 * Removes one or more trailing slash characters from a URL-like string.
 */
export function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}
