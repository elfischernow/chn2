import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_SHORT, CACHE_MEDIUM, CACHE_LONG } from '@/lib/config';

import IDS from './ids.json';
import type { SparklinePoint, SparklineRange, TopCurrency } from './types';

export type { SparklinePoint, SparklineRange, TopCurrency } from './types';
export { SPARKLINE_RANGES } from './types';

/**
 * Default Cryptorank upstream — same Bento-hosted proxy the legacy SPA
 * pointed at. The proxy fronts `api.cryptorank.io` and pins the API key
 * server-side, which is why we don't carry one ourselves.
 *
 * Override with `CRYPTORANK_API_BASEURL` to point at your own proxy or
 * the public Cryptorank API directly (`api.cryptorank.io/v0` — needs an
 * `api_key` header, set `CRYPTORANK_API_KEY`).
 */
const DEFAULT_BASE = 'https://front.bento.capital/cryptorank';

/**
 * Static lookup `coin_link → cryptorank_id` (618 entries, ported verbatim
 * from the legacy SPA's `react-ssr/data/crypto-rank-ids.json`). Stable on
 * Cryptorank's side; refresh once a quarter via the legacy
 * `src/server/scripts/cryptorank-ids` script (which calls the same
 * `/currencies?symbol=…` endpoint we use as a fallback below).
 */
const ID_MAP = IDS as Record<string, number>;

export function getCryptorankId(coinLink: string | null | undefined): number | null {
  if (!coinLink) return null;
  return ID_MAP[coinLink.toLowerCase()] ?? null;
}

/**
 * Resolve a Cryptorank ID for a coin that isn't in the static map by
 * querying the upstream's `/currencies?symbol=…` endpoint. Mirrors the
 * legacy `fetchCurrencyCryptorankId` helper (sortBy=rank, ASC — picks
 * the most-popular coin when multiple share a symbol). Cached for
 * `CACHE_LONG` (1 week) since the symbol→id map almost never changes.
 *
 * Used as a fallback inside `getSparkline` so a missed entry in
 * `ids.json` quietly self-heals at runtime instead of forcing a
 * Cryptorank → TradingView demotion.
 */
export async function resolveCryptorankIdBySymbol(
  symbol: string | null | undefined,
): Promise<number | null> {
  if (!symbol) return null;
  return loadIdBySymbol(symbol.toLowerCase());
}

const loadIdBySymbol = unstable_cache(
  async (symbol: string): Promise<number | null> => {
    const base = (process.env.CRYPTORANK_API_BASEURL ?? DEFAULT_BASE).replace(/\/$/, '');
    if (!base) return null;
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      sortBy: 'rank',
      sortDirection: 'ASC',
    });
    try {
      const res = await fetch(`${base}/currencies?${params.toString()}`, {
        headers: cryptorankHeaders(),
        next: { revalidate: CACHE_LONG },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: Array<{ id?: number; symbol?: string }> };
      const top = json?.data?.find((x) => typeof x.id === 'number');
      return top?.id ?? null;
    } catch {
      return null;
    }
  },
  ['cryptorank-id-by-symbol-v1'],
  { revalidate: CACHE_LONG, tags: ['cryptorank'] },
);

interface RangeConfig {
  /** Cryptorank `interval` param. */
  interval: '15m' | '1h' | '1d';
  /** Number of candles to ask for. */
  limit: 100 | 500 | 1000;
  /** Window length in days, used to compute `from`. */
  days: number;
}

const RANGES: Record<SparklineRange, RangeConfig> = {
  '1D': { interval: '15m', limit: 100, days: 1 },
  '1W': { interval: '1h', limit: 500, days: 7 },
  '1M': { interval: '1d', limit: 100, days: 30 },
  '3M': { interval: '1d', limit: 100, days: 90 },
  '1Y': { interval: '1d', limit: 500, days: 365 },
  '2Y': { interval: '1d', limit: 1000, days: 728 },
};

/**
 * True when we have any Cryptorank-shaped upstream wired (env override
 * or the bento default). The check exists for surface code that wants
 * to short-circuit before doing any work — `getSparkline` itself is
 * also defensive and returns `null` on misconfig.
 */
export function isCryptorankConfigured(): boolean {
  return Boolean(process.env.CRYPTORANK_API_BASEURL ?? DEFAULT_BASE);
}

/**
 * Fetch a single coin's sparkline. Returns `null` when the coin has no
 * Cryptorank ID, the upstream errors, or the response is empty — the
 * caller renders the TradingView fallback in that case.
 *
 * Cached per (id, range) for `CACHE_SHORT` (1 min) on intraday windows
 * and `CACHE_MEDIUM` (1 h) on multi-day windows; the data on Cryptorank
 * itself updates at roughly that cadence so we mirror it.
 */
export async function getSparkline(
  cryptorankId: number,
  range: SparklineRange,
): Promise<SparklinePoint[] | null> {
  return loadSparkline(cryptorankId, range);
}

const loadSparkline = unstable_cache(
  async (id: number, range: SparklineRange): Promise<SparklinePoint[] | null> => {
    const cfg = RANGES[range];
    if (!cfg) return null;
    const base = (process.env.CRYPTORANK_API_BASEURL ?? DEFAULT_BASE).replace(/\/$/, '');
    if (!base) return null;

    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - cfg.days);
    const toDate = new Date();
    toDate.setHours(23, 59, 0, 0);

    const params = new URLSearchParams({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      interval: cfg.interval,
      limit: String(cfg.limit),
    });

    try {
      const res = await fetch(`${base}/currencies/${id}/sparkline?${params.toString()}`, {
        headers: cryptorankHeaders(),
        next: { revalidate: revalidateFor(range) },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: { values?: RawPoint[] } };
      const values = json?.data?.values;
      if (!Array.isArray(values)) return null;
      return values
        .map((v) => ({ timestamp: Number(v.timestamp), price: Number(v.price) }))
        .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price));
    } catch {
      return null;
    }
  },
  ['cryptorank-sparkline-v2'],
  { revalidate: CACHE_MEDIUM, tags: ['cryptorank'] },
);

interface RawPoint {
  timestamp: number | string;
  price: number | string;
}

/**
 * Headers used for every Cryptorank request. The bento proxy doesn't
 * need an api_key (it pins one upstream), but the public Cryptorank
 * API does. We send `api_key` only when `CRYPTORANK_API_KEY` is set so
 * a header doesn't leak through the proxy where it would be ignored.
 */
function cryptorankHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.CRYPTORANK_API_KEY) {
    headers['api_key'] = process.env.CRYPTORANK_API_KEY;
  }
  return headers;
}

function revalidateFor(range: SparklineRange): number {
  // Intraday windows refresh fast, longer ones rarely change.
  return range === '1D' || range === '1W' ? CACHE_SHORT : CACHE_MEDIUM;
}

/**
 * Fetch the top-N coins by market-cap rank with price + volume + icon.
 * The Cryptorank `limit` param is enum-bound to {100, 500, 1000} on the
 * upstream — we always ask for 100 (smallest valid bucket) and slice
 * down. Cached for `CACHE_SHORT` (1 min) so the homepage rates board
 * mirrors the cryptorank refresh cadence.
 */
export async function getTopCurrencies(take = 8): Promise<TopCurrency[]> {
  const all = await loadTopCurrencies();
  return all.slice(0, take);
}

const loadTopCurrencies = unstable_cache(
  async (): Promise<TopCurrency[]> => {
    const base = (process.env.CRYPTORANK_API_BASEURL ?? DEFAULT_BASE).replace(/\/$/, '');
    if (!base) return [];
    const params = new URLSearchParams({
      sortBy: 'rank',
      sortDirection: 'ASC',
      limit: '100',
    });
    try {
      const res = await fetch(`${base}/currencies?${params.toString()}`, {
        headers: cryptorankHeaders(),
        next: { revalidate: CACHE_SHORT },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: RawTopCurrency[] };
      const rows = json?.data;
      if (!Array.isArray(rows)) return [];
      return rows
        .map(toTopCurrency)
        .filter((c): c is TopCurrency => c !== null);
    } catch {
      return [];
    }
  },
  ['cryptorank-top-currencies-v1'],
  { revalidate: CACHE_SHORT, tags: ['cryptorank'] },
);

interface RawTopCurrency {
  id?: number;
  symbol?: string;
  name?: string;
  key?: string;
  rank?: number | null;
  price?: string | number;
  marketCap?: string | number | null;
  volume24h?: string | number | null;
  images?: { x60?: string; x150?: string; icon?: string; native?: string };
}

function toTopCurrency(r: RawTopCurrency): TopCurrency | null {
  const price = Number(r.price);
  if (!Number.isFinite(price) || !r.id || !r.symbol || !r.name || !r.key) return null;
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: r.id,
    symbol: r.symbol.toUpperCase(),
    name: r.name,
    key: r.key,
    rank: typeof r.rank === 'number' ? r.rank : null,
    price,
    marketCap: num(r.marketCap),
    volume24h: num(r.volume24h),
    iconUrl: r.images?.x60 ?? r.images?.icon ?? r.images?.native ?? null,
  };
}
