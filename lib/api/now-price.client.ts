// Browser-side NOW→USD lookup. Used by the cashback upsell in the
// calculator: the upstream cashback endpoint returns the bonus in NOW
// token, and we want to surface a dollar figure. Mirrors the server-side
// `getNowUsdPrice` in `lib/api/currencies.ts` but runs in the bundle so
// the calculator can compose the estimate and the price in a single
// client round-trip — no Next proxy in front.

import { CONTENT_API_PUBLIC_BASE } from '../config';

const TTL_MS = 5 * 60 * 1000;

let cache: { value: number | null; expiresAt: number } | null = null;
let inflight: Promise<number | null> | null = null;

async function fetchNowUsdPrice(signal?: AbortSignal): Promise<number | null> {
  let res: Response;
  try {
    res = await fetch(`${CONTENT_API_PUBLIC_BASE}/currencies/light?ticker=now`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const arr = (await res.json().catch(() => null)) as Array<{
    price?: unknown;
    price_currency?: unknown;
    ticker?: unknown;
  }> | null;
  if (!Array.isArray(arr)) return null;
  const row = arr.find(
    (r) => typeof r.ticker === 'string' && r.ticker.toLowerCase() === 'now',
  );
  if (!row) return null;
  if (
    typeof row.price_currency !== 'string' ||
    row.price_currency.toLowerCase() !== 'usd'
  ) {
    return null;
  }
  const price = typeof row.price === 'number' ? row.price : Number(row.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * Get the cached NOW→USD price, refreshing when stale. In-memory cache
 * shared across calls for the lifetime of the page; concurrent callers
 * share a single in-flight request.
 *
 * Pass `signal` only when you want to abort YOUR wait — the underlying
 * fetch uses its own signal so the cache fills regardless of who started
 * the request.
 */
export async function getNowUsdPriceClient(
  signal?: AbortSignal,
): Promise<number | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  if (inflight) {
    // Race the existing fetch against the caller's abort.
    if (!signal) return inflight;
    return new Promise<number | null>((resolve, reject) => {
      const onAbort = () => reject(signal!.reason ?? new Error('aborted'));
      if (signal!.aborted) {
        reject(signal!.reason ?? new Error('aborted'));
        return;
      }
      signal!.addEventListener('abort', onAbort, { once: true });
      inflight!
        .then((v) => resolve(v))
        .catch((e) => reject(e))
        .finally(() => signal!.removeEventListener('abort', onAbort));
    });
  }
  inflight = fetchNowUsdPrice().then((value) => {
    cache = { value, expiresAt: Date.now() + TTL_MS };
    inflight = null;
    return value;
  });
  return inflight;
}
