import 'server-only';

import { LRU } from './lru';
import { redisGet, redisSet } from './redis';

/**
 * Multi-layer wrapper: in-pod LRU → Redis L2 → fetcher → fallback.
 *
 * Use for any read that:
 *   - Has a stable cache key (parameters → string).
 *   - Is shared across pods (otherwise plain `unstable_cache` is fine).
 *   - Has a sensible "use stale data on outage" fallback.
 *
 * Writes to Redis are best-effort and never block the response. The
 * fallback runs only if both Redis and the fetcher come back empty/error.
 */

interface Options<T> {
  ttlMsLru: number;
  ttlSecRedis: number;
  fetcher: () => Promise<T | null>;
  fallback?: () => Promise<T | null> | T | null;
  /** Allow callers to validate the cached value (drop stale schemas). */
  validate?: (v: unknown) => v is T;
}

const lru = new LRU<string, unknown>(2_000);

export async function getCached<T>(key: string, opts: Options<T>): Promise<T | null> {
  const cached = lru.get(key) as T | undefined;
  if (cached !== undefined) return cached;

  const fromRedis = await redisGet(key);
  if (fromRedis) {
    try {
      const parsed = JSON.parse(fromRedis) as unknown;
      if (!opts.validate || opts.validate(parsed)) {
        lru.set(key, parsed, opts.ttlMsLru);
        return parsed as T;
      }
    } catch {
      // ignore: fall through to fetcher
    }
  }

  try {
    const fresh = await opts.fetcher();
    if (fresh !== null && fresh !== undefined) {
      lru.set(key, fresh, opts.ttlMsLru);
      void redisSet(key, JSON.stringify(fresh), opts.ttlSecRedis);
      return fresh;
    }
  } catch {
    // ignore: fall through to fallback
  }

  if (opts.fallback) {
    const fb = await opts.fallback();
    if (fb !== null && fb !== undefined) {
      lru.set(key, fb, Math.min(opts.ttlMsLru, 5_000));
      return fb;
    }
  }

  return null;
}

/** For tests / debug. */
export function _evict(key: string): void {
  lru.delete(key);
}
