/**
 * @file Small in-memory TTL cache for runtime model-list lookups.
 */

/** Default cache TTL for provider model lists. */
export const MODEL_LIST_CACHE_TTL_MS = 60_000

interface TtlCacheOptions {
  /** Cache entry TTL in milliseconds. */
  ttlMs?: number
  /** Clock source, injectable for deterministic tests. */
  now?: () => number
}

interface TtlCacheEntry<T> {
  /** Timestamp after which the entry must be reloaded. */
  expiresAt: number
  /** In-flight or resolved value for this cache key. */
  value: Promise<T>
}

export interface TtlCache<T> {
  /**
   * Returns a cached value or loads it when absent/expired.
   *
   * Concurrent misses for the same key share one loader call. Failed loads are
   * evicted so transient provider outages do not poison the cache.
   */
  get: (key: string, load: () => Promise<T>) => Promise<T>
  /** Clears one key or the whole cache. */
  clear: (key?: string) => void
}

/**
 * Creates a process-local TTL cache.
 *
 * @param options - Optional TTL and clock overrides.
 * @returns Cache facade with `get` and `clear`.
 */
export function createTtlCache<T>(options: TtlCacheOptions = {}): TtlCache<T> {
  const ttlMs = options.ttlMs ?? MODEL_LIST_CACHE_TTL_MS
  const now = options.now ?? Date.now
  const entries = new Map<string, TtlCacheEntry<T>>()

  return {
    get(key, load) {
      const currentTime = now()
      const cached = entries.get(key)

      if (cached && cached.expiresAt > currentTime) {
        return cached.value
      }

      let value: Promise<T>

      try {
        value = Promise.resolve(load())
      } catch (error) {
        value = Promise.reject(error)
      }

      entries.set(key, {
        expiresAt: currentTime + ttlMs,
        value
      })

      void value.catch(() => {
        if (entries.get(key)?.value === value) {
          entries.delete(key)
        }
      })

      return value
    },
    clear(key) {
      if (key) {
        entries.delete(key)
        return
      }

      entries.clear()
    }
  }
}
