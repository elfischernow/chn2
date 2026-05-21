import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, CACHE_SHORT } from '@/lib/config';

import { getCurrencies } from './currencies';

// ─── Predictions ────────────────────────────────────────────────────────────

/**
 * Card-side prediction event. Mirrors only the fields the homepage card
 * needs — the full upstream shape carries odds history, comments, etc.
 * that we don't render.
 */
export interface PredictionEvent {
  id: string;
  title: string;
  /** ISO timestamp when the market closes. Used to filter out events that
   *  are about to settle (less than 72h horizon would make a stale card). */
  endsAt: string;
  /** Square thumbnail URL from Polymarket's upload CDN. `null` when upstream
   *  ships no icon (rare; typically only on freshly-listed events). */
  imageUrl: string | null;
  /** First (typically YES) outcome label + price as a 0-100 percent number. */
  primaryOutcome: {
    label: string;
    pricePct: number;
  };
}

const PREDICTIONS_BASE_URL =
  process.env.PREDICTIONS_MARKET_API_BASE_URL ?? 'https://front.bento.capital/pm';

// Skip events ending within this window — the marketing card should land
// on a market with at least a few days of horizon so the value stays valid
// while the card sits in cache.
const MIN_HORIZON_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

/**
 * Upstream Polymarket-style event from `/pm/events`. The interesting bits
 * live inside the `markets[]` array (each event groups multiple markets).
 * `outcomePrices` and `outcomes` arrive as JSON-encoded stringified arrays
 * in some versions and as plain JS arrays in others — both are handled.
 */
interface UpstreamPredictionEvent {
  id?: unknown;
  title?: unknown;
  closed?: unknown;
  /** Polymarket-hosted thumbnail; either an absolute URL or null. */
  icon?: unknown;
  /** Some events use `image` instead of (or alongside) `icon`. */
  image?: unknown;
  markets?: Array<{
    id?: unknown;
    question?: unknown;
    endDate?: unknown;
    closed?: unknown;
    outcomes?: unknown;
    outcomePrices?: unknown;
    icon?: unknown;
    image?: unknown;
  }> | null;
}

const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Coerce one of the polymorphic shapes upstream uses for outcome arrays
 * into a plain string[]. `outcomes` is either `["Yes","No"]` or
 * `'["Yes","No"]'` depending on the variant of the API; same for
 * `outcomePrices`.
 */
const coerceStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter((x) => x.length > 0);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => str(x)).filter((x) => x.length > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
};

async function fetchPredictionEvent(): Promise<PredictionEvent | null> {
  // `closed=false` filters out resolved markets at the upstream level —
  // critical, because the catalog otherwise leads with high-volume
  // already-settled events (MicroStrategy 2025 etc.) whose outcome prices
  // are pinned at "0" / "1".
  const url =
    `${PREDICTIONS_BASE_URL.replace(/\/$/, '')}` +
    `/events?active=true&closed=false&limit=30`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const raw = (await res.json().catch(() => null)) as
    | UpstreamPredictionEvent[]
    | { data?: UpstreamPredictionEvent[] }
    | null;
  const list: UpstreamPredictionEvent[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  const now = Date.now();
  for (const ev of list) {
    if (ev.closed === true) continue;
    // Each event groups markets — pick the first non-closed market with a
    // far-enough endDate. Most events have a single market; for ladder
    // markets ("X by Y? — Jan/Feb/Mar") we want the earliest still-open
    // resolution date, which is also the first item the upstream sorts by.
    const market = (ev.markets ?? []).find((m) => {
      if (m.closed === true) return false;
      const ts = Date.parse(str(m.endDate));
      return Number.isFinite(ts) && ts - now >= MIN_HORIZON_MS;
    });
    if (!market) continue;
    const outcomes = coerceStringArray(market.outcomes);
    const prices = coerceStringArray(market.outcomePrices).map(num);
    if (outcomes.length === 0 || prices.length === 0) continue;
    const primary = num(prices[0]);
    // Reject edge prices (already-decided markets sometimes show 0/1
    // even when `closed=false`). Below 1% or above 99% is not a market.
    if (primary <= 0.01 || primary >= 0.99) continue;
    const id = str(ev.id) || str(market.id);
    // `market.question` is the specific yes/no that the `outcomePrices`
    // resolve against ("MicroStrategy sells any Bitcoin in 2025?"); the
    // parent `event.title` is the ladder-group umbrella that carries
    // unresolved date placeholders ("MicroStrategy sells any Bitcoin
    // by ___ ?"). Pricing 84¢ next to the umbrella reads as a generic
    // claim — pricing it next to the concrete market question is the
    // actual outcome the card is offering. Use market.question first,
    // fall back to event.title only when the upstream omits both.
    const question = str(market.question).trim();
    const eventTitle = str(ev.title).trim();
    // Reject titles with the `___` ladder placeholder — they only show
    // up at event level; if a market.question also has them upstream is
    // misconfigured and the card would read as nonsense.
    const hasLadderPlaceholder = (s: string) => /\b_{2,}\b|\b_+\s*\?/.test(s);
    let title = question && !hasLadderPlaceholder(question) ? question : '';
    if (!title && eventTitle && !hasLadderPlaceholder(eventTitle)) title = eventTitle;
    if (!id || !title) continue;
    // Image preference: market-level icon/image first (the ladder rung's
    // own thumbnail, when shipped); otherwise the event-level thumbnail
    // (the group's representative icon). Most events have the same icon
    // on both levels — the cascade only matters for hand-curated markets.
    const imageUrl = (() => {
      const candidates = [market.icon, market.image, ev.icon, ev.image];
      for (const c of candidates) {
        const s = str(c).trim();
        if (s.startsWith('https://')) return s;
      }
      return null;
    })();
    return {
      id,
      title,
      endsAt: str(market.endDate),
      imageUrl,
      primaryOutcome: {
        label: outcomes[0] ?? 'YES',
        pricePct: Math.round(primary * 100),
      },
    };
  }
  return null;
}

/**
 * Server-cached fetcher. 1 h TTL is plenty for a marketing card — events
 * don't open or close that often, and we don't need second-by-second odds.
 * If the upstream is unreachable (dev without VPN, transient 5xx) the
 * homepage falls back to a built-in placeholder so the card never blanks.
 */
export const getPredictionEvent = unstable_cache(
  fetchPredictionEvent,
  ['featured-prediction-event-v4-image'],
  { revalidate: CACHE_MEDIUM, tags: ['featured-block'] },
);

// ─── RWA tickers (sourced from the calculator catalog) ─────────────────────

export interface RwaTicker {
  ticker: string;
  /** Human label rendered on the card (`Gold`, `Apple`, `NVIDIA`). */
  label: string;
  /** Current USD price; `null` when upstream omits one. */
  priceUsd: number | null;
  /** 24h change in percent (signed). `null` if upstream omits. */
  change24hPct: number | null;
}

/**
 * Three RWA rows for the Featured card. Names are intentionally kept short
 * for the card layout; the ticker chip shows the raw symbol. Each row maps
 * to a canonical `/currencies/light` ticker — we reuse the calculator's
 * already-cached `getCurrencies()` output rather than re-fetching the
 * (~1.8MB) catalog separately. Same data source, one network hop.
 */
const RWA_REQUEST: ReadonlyArray<{ ticker: string; label: string }> = [
  // Tether Gold — `xaut` is the canonical row, no chain suffix.
  { ticker: 'xaut', label: 'Gold' },
  // NVIDIA tokenized stock — Ondo's variant trades against the deepest
  // book among the catalog entries.
  { ticker: 'nvdaonerc20', label: 'NVIDIA' },
  // Apple tokenized stock — same rationale.
  { ticker: 'aaplonerc20', label: 'Apple' },
];

async function buildRwaTickers(): Promise<RwaTicker[]> {
  const currencies = await getCurrencies();
  return RWA_REQUEST.map((req) => {
    const row = currencies.find((c) => c.ticker.toLowerCase() === req.ticker);
    if (!row) return { ...req, priceUsd: null, change24hPct: null };
    return {
      ...req,
      priceUsd: row.priceUsd,
      change24hPct: row.percentChange24h,
    };
  });
}

/**
 * Wrapped in `unstable_cache` purely so the JOIN against the catalog is
 * memoised — `getCurrencies()` itself owns the upstream TTL, so this layer
 * just caches the per-ticker pluck.
 */
export const getRwaTickers = unstable_cache(
  buildRwaTickers,
  ['featured-rwa-tickers-v2-from-catalog'],
  { revalidate: CACHE_SHORT * 5, tags: ['featured-block', 'currencies'] },
);

// ─── BTC weekly candles ─────────────────────────────────────────────────────

export interface BtcCandle {
  /** Unix seconds — same as CryptoCompare's `time` field. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const CC_BASE_URL = process.env.CC_API_URL ?? 'https://min-api.cryptocompare.com/data';

interface UpstreamCcCandle {
  time?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
}

async function fetchBtcCandles(): Promise<BtcCandle[]> {
  // Daily candles, last 56 days = ~8 weeks. Enough for an attractive curve
  // spanning the three trade-row cards without overflowing the card width.
  const url = `${CC_BASE_URL.replace(/\/$/, '')}/v2/histoday?fsym=BTC&tsym=USD&limit=56`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as
    | { Data?: { Data?: UpstreamCcCandle[] } | UpstreamCcCandle[] }
    | null;
  const raw =
    Array.isArray(json?.Data) ? json.Data
    : Array.isArray(json?.Data?.Data) ? json.Data.Data
    : null;
  if (!raw) return [];
  return raw
    .map((c) => ({
      time: num(c.time),
      open: num(c.open),
      high: num(c.high),
      low: num(c.low),
      close: num(c.close),
    }))
    .filter((c) => c.time > 0 && c.close > 0);
}

export const getBtcCandles = unstable_cache(
  fetchBtcCandles,
  ['featured-btc-candles-v1'],
  { revalidate: CACHE_SHORT * 10, tags: ['featured-block'] }, // 10 min — daily candles barely move within that
);
