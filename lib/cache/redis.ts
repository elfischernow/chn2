import 'server-only';

import IORedis, { type Redis } from 'ioredis';

/**
 * Redis client with circuit breaker. Why this shape:
 *
 *  1. Multi-pod self-hosted deploy → per-pod `unstable_cache` makes N
 *     Strapi calls per revalidate window. Redis as shared L2 collapses to
 *     one. See docs/currencies-migration.md §4.1.
 *
 *  2. Plan B: when Redis dies, the app must keep serving (degraded). Every
 *     op is wrapped in a 200 ms timeout + try/catch; sustained failures
 *     trip the breaker and short-circuit subsequent calls so we don't
 *     pay the timeout each request. Callers get `null` and fall back to
 *     in-pod LRU + snapshot. See §4.3.1.
 *
 *  3. ioredis is intentionally `lazyConnect: true` — the first network
 *     attempt happens on the first op, not at module load. That means
 *     `import` never blocks, and missing/wrong REDIS_URL is harmless
 *     until something tries to use the cache.
 */

const FAIL_WINDOW_MS = 10_000;
const FAIL_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000;
const REDIS_TIMEOUT_MS = 200;

type BreakerState = 'closed' | 'open' | 'half-open';

let client: Redis | null = null;
let breakerState: BreakerState = 'closed';
let failureCount = 0;
let firstFailureAt = 0;
let openedAt = 0;

function getClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (client) return client;
  try {
    client = new IORedis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_000,
      retryStrategy: (times) => Math.min(times * 200, 2_000),
    });
    // Swallow connection errors — the breaker will trip via op failures.
    client.on('error', () => {});
  } catch {
    client = null;
  }
  return client;
}

function recordFailure(): void {
  const now = Date.now();
  if (failureCount === 0 || now - firstFailureAt > FAIL_WINDOW_MS) {
    firstFailureAt = now;
    failureCount = 1;
  } else {
    failureCount++;
  }
  if (failureCount >= FAIL_THRESHOLD && breakerState !== 'open') {
    breakerState = 'open';
    openedAt = now;
  }
}

function recordSuccess(): void {
  if (breakerState !== 'closed') breakerState = 'closed';
  failureCount = 0;
}

function canTry(): boolean {
  if (breakerState === 'closed') return true;
  if (breakerState === 'open') {
    if (Date.now() - openedAt > OPEN_DURATION_MS) {
      breakerState = 'half-open';
      return true;
    }
    return false;
  }
  return true;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('redis-timeout')), ms),
    ),
  ]);
}

async function run<T>(op: (r: Redis) => Promise<T>, fallback: T): Promise<T> {
  if (!canTry()) return fallback;
  const r = getClient();
  if (!r) return fallback;
  try {
    const v = await withTimeout(op(r), REDIS_TIMEOUT_MS);
    recordSuccess();
    return v;
  } catch {
    recordFailure();
    return fallback;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  return run((r) => r.get(key), null);
}

export async function redisSet(key: string, value: string, ttlSec: number): Promise<boolean> {
  return run(async (r) => {
    await r.set(key, value, 'EX', ttlSec);
    return true;
  }, false);
}

export async function redisDel(key: string): Promise<boolean> {
  return run(async (r) => {
    await r.del(key);
    return true;
  }, false);
}

export async function redisHGet(key: string, field: string): Promise<string | null> {
  return run((r) => r.hget(key, field), null);
}

export async function redisHGetAll(key: string): Promise<Record<string, string> | null> {
  return run(async (r) => {
    const out = await r.hgetall(key);
    return out && Object.keys(out).length > 0 ? out : null;
  }, null);
}

export async function redisHSetMany(
  key: string,
  fields: Record<string, string>,
): Promise<boolean> {
  if (Object.keys(fields).length === 0) return true;
  return run(async (r) => {
    // Wipe + write atomically. We don't bother with HMSET diffs; the registry
    // is rebuilt as a whole anyway and atomic rename is what `saveToRedis`
    // uses for the live key. This op only writes to the *staging* key.
    await r.del(key);
    await r.hset(key, fields);
    return true;
  }, false);
}

export async function redisRename(from: string, to: string): Promise<boolean> {
  return run(async (r) => {
    await r.rename(from, to);
    return true;
  }, false);
}

/**
 * Check whether a key exists. Used by the URL Registry to flag itself as
 * "warm" so middleware can confidently 404 a miss, vs. ambiguously pass
 * through during cold start.
 */
export async function redisExists(key: string): Promise<boolean> {
  return run(async (r) => (await r.exists(key)) > 0, false);
}

/**
 * SET NX EX — distributed lock for cron jobs. Returns true if the lock was
 * acquired (caller is the leader); false otherwise. When Redis is down,
 * returns true so the caller can still run locally — multi-pod redundancy
 * is acceptable for the workloads we lock (warm-cache, registry rebuild).
 */
export async function redisAcquireLock(key: string, ttlSec: number): Promise<boolean> {
  if (!process.env.REDIS_URL) return true;
  return run(async (r) => {
    const result = await r.set(key, String(Date.now()), 'EX', ttlSec, 'NX');
    return result === 'OK';
  }, true);
}

/** For tests / diagnostics. */
export function _breakerState(): BreakerState {
  return breakerState;
}
