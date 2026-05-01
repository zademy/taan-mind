/**
 * Extracts the file name from a URL path.
 *
 * @param url - The URL to extract the file name from.
 * @returns The decoded file name, or `'file'` as a fallback.
 */
export function getFileName(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || 'file'
    return decodeURIComponent(filename)
  } catch {
    return 'file'
  }
}

/**
 * Extracts the hostname from a URL, stripping the `www.` prefix.
 *
 * @param url - The URL to extract the domain from.
 * @returns The cleaned domain name, or the original string if parsing fails.
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Generates a Google Favicon service URL for the given website URL.
 *
 * @param url - The website URL to get the favicon for.
 * @returns A URL pointing to the favicon image (32x32).
 */
export function getFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?sz=32&domain=${getDomain(url)}`
}
