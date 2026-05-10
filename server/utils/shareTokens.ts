/** Number of random bytes used to generate each share token. */
const SHARE_TOKEN_BYTES = 32

/** URL-safe token shape produced from 32 random bytes encoded as base64url. */
export const CHAT_SHARE_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/

/**
 * Generates an opaque, URL-safe chat-share token.
 *
 * The token carries no embedded meaning and uses Web Crypto CSPRNG bytes so it
 * works across Nitro presets without adding dependencies.
 */
export function generateChatShareToken(): string {
  const bytes = new Uint8Array(SHARE_TOKEN_BYTES)
  crypto.getRandomValues(bytes)

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

/** Returns true when a route param looks like a chat-share token. */
export function isChatShareToken(value: string): boolean {
  return CHAT_SHARE_TOKEN_REGEX.test(value)
}
