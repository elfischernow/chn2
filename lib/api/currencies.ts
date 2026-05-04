import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, CONTENT_API_BASEURL } from '../config';

// Slim, client-safe shape we hand to the picker. The upstream `currencies/light`
// row carries ~40 fields per currency, most of them irrelevant for selection
// (regex, explorer masks, market caps, etc.). Trimming here keeps the SSR
// payload manageable — at ~1300 currencies the raw response is ~1.8MB; the
// slim form is ~150KB.
export interface Currency {
  /** Upstream numeric primary key. Stable across deploys; used by
   *  `redirectToId` lookups when one row aliases another. */
  id: number;
  /** Display ticker — what the user types ("usdt"). */
  currentTicker: string;
  /** Canonical ticker including network suffix ("usdttrc20"). */
  ticker: string;
  /** Human name ("Tether (TRC-20)"). */
  name: string;
  /** Network code ("trc20", "erc20", "btc"). */
  network: string;
  /** Slug — used for deep-links into /exchange. */
  link: string;
  /** Absolute URL to the icon SVG/PNG, or `null` if upstream omits it. */
  iconUrl: string | null;
  isFiat: boolean;
  isPopular: boolean;
  isStable: boolean;
  isDefi: boolean;
  isPopularFiat: boolean;
  isFixedRateEnabled: boolean;
  /** Upstream ordering hint — lower is more prominent. */
  position: number;
  /** True when this chain requires an extra ID alongside the wallet address
   *  — destination tag (XRP), memo (TON-USDT, Cosmos), payment ID (Monero).
   *  Used by the Private transfer flow to surface a second input. */
  hasExternalId: boolean;
  /** Display label for the extra-id field, e.g. "Destination Tag", "Memo".
   *  `null` when `hasExternalId` is false. */
  externalIdName: string | null;
  /** Per-chain address-format regex from the upstream catalog. Used by the
   *  Private transfer flow for client-side validation before the deep-link
   *  hands off to the legacy page. `null` when the upstream omits one. */
  addressRegex: string | null;
  /** Per-chain regex for the extra-id (memo / destination tag / payment
   *  ID) format. `null` when `hasExternalId` is false or the upstream
   *  omits one. */
  extraIdRegex: string | null;
  /** Catalog-provided "open the calculator with N of this coin pre-filled"
   *  amount (e.g. 0.1 for BTC, 100 for stablecoins). Used by the
   *  homepage calculator to seed the FROM field on mode switch / picker
   *  selection when the user hasn't typed a custom value. `null` when
   *  upstream omits one — fall back to a hardcoded mode-level default. */
  defaultValue: number | null;
  /** Admin override for `defaultValue`. When set, takes priority over
   *  `defaultValue` — see `currencyDefaultAmount` in calculator utils. */
  manualDefaultValue: number | null;
  /**
   * Carries the upstream `is_page` flag verbatim. Note: prod's
   * `/currencies/light` currently ships `is_page: true` for every row
   * (the field is plumbed but not curated by admin), so reading this
   * alone won't filter anything. The real "deserves a page" gate lives
   * in `url-registry.ts` and combines `!isDelisted && !redirectTo`,
   * which together collapse the catalog from 1305 down to ~1060
   * routable coins.
   */
  isPage: boolean;
  /**
   * "Long-tail / not featured" flag from upstream (`is_unpopular`). The
   * legacy SPA uses this as the canonical popularity gate for pair
   * sitemap generation: pairs ride into the sitemap only when at least
   * one side is NOT unpopular (~180 coins out of the 1300-entry
   * catalog). We mirror that rule in `url-registry.isTop`; without it
   * we were treating only the 35 `is_popular` coins as anchors and
   * shipping ~30% of the pair URLs prod has.
   */
  isUnpopular: boolean;
  /**
   * Upstream `id` of the canonical row this entry should redirect to.
   * The upstream sends a numeric currency id (e.g. `7` for the row
   * pointing at the Cardano canonical), not a slug — the URL Registry
   * resolves it back to a `link` at build time. ~245 of the 1305
   * catalog entries carry one. Aliased rows do NOT get their own page;
   * the registry emits a `redirect` entry so `/currencies/<alias>`
   * 301s to `/currencies/<target>` and SEO equity collapses onto the
   * canonical URL.
   */
  redirectToId: number | null;
  /**
   * True when the upstream `exceptions_list` is a non-empty array. Admin-
   * curated 404s — these rows are otherwise routable but the catalog
   * carries an explicit "do not page" override (typically because a
   * listing was pulled or compliance flagged it). Mirrors the legacy
   * `checkIsCurrencyWithExceptionsList` gate; closes the residual ~38
   * coin gap between our 1060 and prod's 1022. We don't surface the
   * actual list — just the boolean — because the legacy filter only
   * checks `length > 0`.
   */
  hasExceptions: boolean;
}

interface UpstreamCurrency {
  id?: unknown;
  ticker?: unknown;
  current_ticker?: unknown;
  name?: unknown;
  network?: unknown;
  link?: unknown;
  is_fiat?: unknown;
  is_popular?: unknown;
  is_stable?: unknown;
  is_defi?: unknown;
  is_popular_fiat?: unknown;
  is_fixed_rate_enabled?: unknown;
  is_delisted?: unknown;
  is_unavailable_payin?: unknown;
  is_unavailable_payout?: unknown;
  position?: unknown;
  icon?: { url?: unknown } | null;
  has_external_id?: unknown;
  external_id_name?: unknown;
  regex?: unknown;
  regex_tag?: unknown;
  default_value?: unknown;
  manual_default_value?: unknown;
  is_page?: unknown;
  is_unpopular?: unknown;
  redirect_to?: unknown;
  exceptions_list?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const normalize = (raw: UpstreamCurrency, host: string): Currency | null => {
  const currentTicker = str(raw.current_ticker).toLowerCase();
  const ticker = str(raw.ticker).toLowerCase();
  const network = str(raw.network).toLowerCase();
  // Drop rows with no usable identity. The upstream occasionally ships
  // empty stubs.
  if (!currentTicker || !ticker) return null;
  // Both directions unavailable → can't be selected for FROM or TO. Drop.
  if (bool(raw.is_unavailable_payin) && bool(raw.is_unavailable_payout)) return null;

  const iconPath = raw.icon && typeof raw.icon === 'object' ? str(raw.icon.url) : '';
  const iconUrl = iconPath
    ? iconPath.startsWith('http')
      ? iconPath
      : `${host}${iconPath.startsWith('/') ? '' : '/'}${iconPath}`
    : null;

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    currentTicker,
    ticker,
    name: str(raw.name),
    network,
    link: str(raw.link),
    iconUrl,
    isFiat: bool(raw.is_fiat),
    isPopular: bool(raw.is_popular),
    isStable: bool(raw.is_stable),
    isDefi: bool(raw.is_defi),
    isPopularFiat: bool(raw.is_popular_fiat),
    isFixedRateEnabled: bool(raw.is_fixed_rate_enabled),
    position: num(raw.position),
    hasExternalId: bool(raw.has_external_id),
    externalIdName: raw.external_id_name ? str(raw.external_id_name) : null,
    addressRegex: raw.regex && str(raw.regex) ? str(raw.regex) : null,
    extraIdRegex: raw.regex_tag && str(raw.regex_tag) ? str(raw.regex_tag) : null,
    defaultValue: optionalPositiveNumber(raw.default_value),
    manualDefaultValue: optionalPositiveNumber(raw.manual_default_value),
    isPage: bool(raw.is_page),
    isUnpopular: bool(raw.is_unpopular),
    redirectToId: typeof raw.redirect_to === 'number' && raw.redirect_to > 0 ? raw.redirect_to : null,
    hasExceptions: Array.isArray(raw.exceptions_list) && raw.exceptions_list.length > 0,
  };
};

// Coerce a catalog "default amount" cell to a usable seed value. Upstream
// occasionally ships `0`, an empty string, or stringified numbers; only a
// strictly-positive finite number is meaningful as a seed (zero would
// render as "0" in the FROM field and confuse the estimate call).
const optionalPositiveNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

async function fetchCurrencies(): Promise<Currency[]> {
  const host = CONTENT_API_BASEURL.replace(/\/$/, '');
  let res: Response;
  try {
    res = await fetch(`${host}/currencies/light`, {
      headers: { Accept: 'application/json' },
      // Internal cache is the unstable_cache below; this fetch should always
      // hit the network when the wrapper decides to revalidate.
      cache: 'no-store',
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const raw = (await res.json().catch(() => null)) as UpstreamCurrency[] | null;
  if (!Array.isArray(raw)) return [];

  const out: Currency[] = [];
  for (const row of raw) {
    if (bool(row.is_delisted)) continue;
    // The upstream still ships a phantom `maticmainnet` network for legacy
    // routing — never selectable, drop it the way the legacy SPA does.
    if (str(row.network).toLowerCase() === 'maticmainnet') continue;
    const c = normalize(row, host);
    if (c) out.push(c);
  }

  // Stable order: popular crypto first, then popular fiat, then by upstream
  // `position` (which the catalog already curates). Search will re-rank when
  // the user types.
  out.sort((a, b) => {
    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
    if (a.isPopularFiat !== b.isPopularFiat) return a.isPopularFiat ? -1 : 1;
    return a.position - b.position;
  });

  return out;
}

/**
 * Server-only cached fetcher for the currency catalog. Cached for 1 hour:
 * the catalog changes when listings are added/removed, which is infrequent,
 * and the picker doesn't need real-time freshness.
 */
export const getCurrencies = unstable_cache(fetchCurrencies, ['currencies-light-v5-hasexceptions'], {
  revalidate: CACHE_MEDIUM,
  tags: ['currencies'],
});

/**
 * NOW token's current USD price. The cashback endpoint (`/v1/cashback/estimate`)
 * returns its value in NOW token rather than USD; we multiply by this to
 * surface a dollar figure in the Pro upsell. Cached for 5 minutes — fresh
 * enough for marketing copy, slack enough not to spam the catalog API.
 */
async function fetchNowUsdPrice(): Promise<number | null> {
  const host = CONTENT_API_BASEURL.replace(/\/$/, '');
  let res: Response;
  try {
    res = await fetch(`${host}/currencies/light?ticker=now`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
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
  const row = arr.find((r) => str(r.ticker).toLowerCase() === 'now');
  if (!row) return null;
  if (str(row.price_currency).toLowerCase() !== 'usd') return null;
  const price = num(row.price);
  return price > 0 ? price : null;
}

export const getNowUsdPrice = unstable_cache(fetchNowUsdPrice, ['now-usd-price'], {
  revalidate: 300,
  tags: ['currencies'],
});
