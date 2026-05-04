import 'server-only';

import { cache } from 'react';

import { LRU } from '../cache/lru';
import {
  redisExists,
  redisHGet,
  redisHGetAll,
  redisHSetMany,
  redisRename,
} from '../cache/redis';
import { strapiFetch } from './content/client';
import { getCurrencies } from './currencies';

/**
 * URL Registry — the single source of truth for which `/currencies/*` URLs
 * exist, redirect, or are gone. See docs/currencies-migration.md §4.3.
 *
 * Consumers (middleware, page resolver, sitemap, HTML-sitemap, table) all
 * read from here and never compute "does this page exist" themselves.
 * The invariant: if it's not `live` in the Registry, no page renders.
 *
 * Why one Registry instead of one-per-locale: the *set of valid URLs* is
 * locale-independent (a coin exists in all languages). The locale-specific
 * thing is page content, not URL membership. Locale-scoped redirects are
 * rare enough we'll handle them out-of-band when they show up.
 */

/**
 * Page-type taxonomy. The two URL families (`/currencies/*` and `/buy/*`)
 * are emitted into the same registry but tagged distinctly so sitemap
 * tiering, priority weighting, and the page resolver can distinguish
 * them without re-parsing the URL. Legacy uses parallel page types
 * (`currency` / `currencies_pair_pages` for /currencies, `buy` /
 * `buy_pair_pages` for /buy); we mirror that shape one-to-one.
 *
 *   `listing`    — the `/currencies` and `/buy` index roots.
 *   `coin`       — `/currencies/<crypto>` info pages.
 *   `pair`       — `/currencies/<a>/<b>` pair pages.
 *   `buy-coin`   — `/buy/<crypto>` "buy this crypto" pages.
 *   `buy-pair`   — `/buy/<fiat>/<crypto>` fiat→crypto buy pages.
 */
export type PageType = 'listing' | 'coin' | 'pair' | 'buy-coin' | 'buy-pair';

export type UrlEntry =
  | {
      status: 'live';
      pageType: PageType;
      updatedAt: string;
      coinLink?: string;
      pairFromLink?: string;
      pairToLink?: string;
    }
  | {
      status: 'redirect';
      target: string;
      pageType: PageType;
    }
  | {
      status: 'gone';
      pageType: PageType;
    };

export type Registry = Map<string, UrlEntry>;

const REDIS_KEY = 'url_registry';
const REDIS_KEY_NEXT = 'url_registry:next';
const LRU_TTL_MS = 60_000;

const registryLru = new LRU<string, Registry>(2);
const REGISTRY_LRU_KEY = 'global';

// ─── Strapi types ────────────────────────────────────────────────────

interface ExceptionRow {
  current_url?: unknown;
  page_type?: unknown;
}

interface RedirectRow {
  page_from?: unknown;
  page_to?: unknown;
  page_type?: unknown;
}

// ─── helpers ────────────────────────────────────────────────────────

/**
 * Legacy Strapi `page_type` strings → our internal {@link PageType}.
 * The collections (`currencies-exceptions-pages`, `currencies-redirects-pages`)
 * carry rows for both URL families (currencies + buy) tagged with these
 * upstream values:
 *   `'currency'`              → coin
 *   `'currencies_pair_pages'` → pair
 *   `'buy'`                   → buy-coin
 *   `'buy_pair_pages'`        → buy-pair
 *   anything else             → coin (safe default)
 */
function pageTypeFromStrapi(pt: unknown): PageType {
  if (typeof pt !== 'string') return 'coin';
  if (pt === 'currencies_pair_pages' || pt === 'pair' || pt === 'pairs') return 'pair';
  if (pt === 'buy_pair_pages') return 'buy-pair';
  if (pt === 'buy') return 'buy-coin';
  return 'coin';
}

/** Normalize a path: ensure leading slash, drop trailing slash, lowercase. */
function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s.toLowerCase();
}

async function fetchExceptions(): Promise<ExceptionRow[]> {
  try {
    return await strapiFetch<ExceptionRow[]>('/currencies-exceptions-pages', {
      limit: 200,
      revalidate: 600,
      tags: ['url-registry', 'exceptions'],
    });
  } catch {
    return [];
  }
}

async function fetchRedirects(): Promise<RedirectRow[]> {
  try {
    return await strapiFetch<RedirectRow[]>('/currencies-redirects-pages', {
      limit: 500,
      revalidate: 600,
      tags: ['url-registry', 'redirects'],
    });
  } catch {
    return [];
  }
}

/**
 * "Top" coins, by the same signal the legacy SPA uses for sitemap pair
 * generation: `!isUnpopular`. The legacy rule is "skip pair if BOTH
 * sides are unpopular" (see `filter-currencies-for-unpopular.js`); we
 * mirror it as "anchor pair when at least one side is NOT unpopular."
 *
 * Earlier we used `isPopular || isPopularFiat`, which matched only ~35
 * coins and shipped roughly a third of prod's pair URLs (90k vs 272k).
 * `!isUnpopular` widens the anchor set to ~180 coins, which lines up
 * with prod's pair count.
 */
function isTop(c: { isUnpopular: boolean }): boolean {
  return !c.isUnpopular;
}

// ─── builder ────────────────────────────────────────────────────────

async function buildRegistry(): Promise<Registry> {
  const reg: Registry = new Map();
  const now = new Date().toISOString();

  // 1. Listing root
  reg.set('/currencies', {
    status: 'live',
    pageType: 'listing',
    updatedAt: now,
  });

  // 2. Coin pages — only catalog entries that warrant their own URL.
  //    Three filters, mirroring legacy `generateValidCurrenciesSingle`:
  //      • drop rows where `link` is missing.
  //      • drop rows with `redirect_to` set — these are aliases that
  //        301 to a canonical slug (legacy emits a redirect entry, no
  //        page). Snapshot is_delisted is already filtered upstream of
  //        `getCurrencies()` so we don't re-check it here.
  //      • drop fiat rows — fiat coins live under `/buy/<fiat>` not
  //        `/currencies/<fiat>`. Legacy filters fiat at the start of
  //        single-coin sitemap generation; we hit prod's 1022 exactly
  //        by mirroring this (1060 catalog-routable - 38 fiat = 1022).
  //    The upstream `is_page` flag is currently `true` for every row
  //    (admin doesn't curate it), so it can't act as the page gate on
  //    its own — we keep `Currency.isPage` for callers that want it but
  //    don't read it here.
  //
  //    `hasExceptions` (per-row `exceptions_list[]` from upstream) is
  //    NOT used as a pageable filter here. Those rows carry redirect
  //    rules served via the Strapi `currencies-exceptions-pages`
  //    collection (step 4 below); prod ships them as 200s in the
  //    catalog and lets the Strapi collection layer redirects on top.
  //    Filtering them here would undercount by 5.
  const currencies = await getCurrencies();
  const linkById = new Map<number, string>();
  for (const c of currencies) {
    if (c.id && c.link) linkById.set(c.id, c.link);
  }
  const pageable = currencies.filter((c) => c.link && !c.redirectToId && !c.isFiat);
  for (const c of pageable) {
    const url = `/currencies/${c.link}`.toLowerCase();
    if (!reg.has(url)) {
      reg.set(url, {
        status: 'live',
        pageType: 'coin',
        coinLink: c.link,
        updatedAt: now,
      });
    }
  }

  // 2a. Catalog-driven coin redirects — alias rows ship `redirect_to`
  //     pointing at the canonical row's numeric `id` (e.g. `bnb`'s row
  //     redirects to `binance-coin-smart-chain`'s id). Resolve the id
  //     back to a slug via `linkById` and emit a redirect entry so
  //     `/currencies/<alias>` 301s to the canonical page; the middleware
  //     reads this on the hot path. CMS-curated redirects (step 5 below)
  //     still win when they overlap — admin overrides catalog.
  for (const c of currencies) {
    if (!c.link || !c.redirectToId) continue;
    const target = linkById.get(c.redirectToId);
    if (!target) continue;
    const url = `/currencies/${c.link}`.toLowerCase();
    if (reg.has(url)) continue;
    reg.set(url, {
      status: 'redirect',
      target: `/currencies/${target}`,
      pageType: 'coin',
    });
  }

  // 3. Pair pages — top × top, top × non-top, non-top × top, but only
  //    among pageable coins. A non-pageable network sibling can still
  //    appear inside the parent's "Available networks" table; it just
  //    doesn't anchor a pair URL.
  for (const a of pageable) {
    const aTop = isTop(a);
    for (const b of pageable) {
      if (a.link === b.link) continue;
      const bTop = isTop(b);
      if (!aTop && !bTop) continue;
      const url = `/currencies/${a.link}/${b.link}`.toLowerCase();
      if (!reg.has(url)) {
        reg.set(url, {
          status: 'live',
          pageType: 'pair',
          pairFromLink: a.link,
          pairToLink: b.link,
          updatedAt: now,
        });
      }
    }
  }

  // 3a. /buy listing root.
  reg.set('/buy', {
    status: 'live',
    pageType: 'listing',
    updatedAt: now,
  });

  // 3b. /buy/<crypto> single-coin buy pages. Mirrors legacy
  //     `generateValidBuySingle`: every routable crypto gets a /buy/<link>
  //     page (the same coin set as /currencies, sans fiats — fiat
  //     `pageable` already excluded above). Same `pageable` list, just a
  //     different URL prefix.
  const buyableCrypto = pageable; // !isFiat is already enforced
  for (const c of buyableCrypto) {
    const url = `/buy/${c.link}`.toLowerCase();
    if (!reg.has(url)) {
      reg.set(url, {
        status: 'live',
        pageType: 'buy-coin',
        coinLink: c.link,
        updatedAt: now,
      });
    }
  }

  // 3c. /buy/<fiat>/<crypto> pair pages. Mirrors legacy
  //     `generateValidBuyPairs`:
  //       • fiat side:  catalog row with `isFiat && !redirectToId`
  //       • crypto side: routable AND `!isUnpopular` (only top cryptos
  //                      get fiat pair pages)
  //       • exclude fiat link `'dollar'` — this is a legacy alias slug
  //         that prod redirects to /buy/<crypto> instead of rendering
  //         a fiat-pair page; emit as a `redirect` entry so we don't
  //         orphan inbound links to /buy/dollar/<crypto>.
  const fiatAnchors = currencies.filter((c) => c.isFiat && !c.redirectToId && c.link);
  for (const f of fiatAnchors) {
    const isDollar = f.link === 'dollar';
    for (const c of buyableCrypto) {
      if (c.isUnpopular) continue;
      const url = `/buy/${f.link}/${c.link}`.toLowerCase();
      if (reg.has(url)) continue;
      if (isDollar) {
        reg.set(url, {
          status: 'redirect',
          target: `/buy/${c.link}`,
          pageType: 'buy-pair',
        });
      } else {
        reg.set(url, {
          status: 'live',
          pageType: 'buy-pair',
          pairFromLink: f.link,
          pairToLink: c.link,
          updatedAt: now,
        });
      }
    }
  }

  // 4. Exceptions — admin-overridden URLs that wouldn't be inferred from
  //    the catalog alone. Only add if not already present (don't override
  //    a `live` from the catalog).
  const exceptions = await fetchExceptions();
  for (const e of exceptions) {
    const url = normalizeUrl(e.current_url);
    if (!url || reg.has(url)) continue;
    reg.set(url, {
      status: 'live',
      pageType: pageTypeFromStrapi(e.page_type),
      updatedAt: now,
    });
  }

  // 5. Redirects — these win over `live`. If A redirects to B and B is
  //    itself a redirect to C, we don't resolve transitively here; the
  //    middleware does one hop and 301s. Cycle-detect / collapse can come
  //    later if it bites.
  const redirects = await fetchRedirects();
  for (const r of redirects) {
    const from = normalizeUrl(r.page_from);
    const to = normalizeUrl(r.page_to);
    if (!from || !to) continue;
    reg.set(from, {
      status: 'redirect',
      target: to,
      pageType: pageTypeFromStrapi(r.page_type),
    });
  }

  return reg;
}

/**
 * Single-flight per request: React's `cache()` deduplicates concurrent
 * `getRegistry()` calls inside the same render so we don't rebuild N
 * times when N components ask in parallel.
 */
const buildOnce = cache(buildRegistry);

// ─── Redis I/O ──────────────────────────────────────────────────────

async function loadFromRedis(): Promise<Registry | null> {
  const data = await redisHGetAll(REDIS_KEY);
  if (!data) return null;
  const reg: Registry = new Map();
  for (const [k, v] of Object.entries(data)) {
    try {
      reg.set(k, JSON.parse(v) as UrlEntry);
    } catch {
      // skip malformed entry
    }
  }
  return reg.size > 0 ? reg : null;
}

async function saveToRedis(reg: Registry): Promise<void> {
  if (reg.size === 0) return;
  const flat: Record<string, string> = {};
  for (const [k, v] of reg) flat[k] = JSON.stringify(v);

  // Write to staging key, then atomic rename → live key. Best-effort:
  // failures are swallowed by the redis wrapper; readers continue using
  // the previous live snapshot.
  const ok = await redisHSetMany(REDIS_KEY_NEXT, flat);
  if (!ok) return;
  await redisRename(REDIS_KEY_NEXT, REDIS_KEY);
}

// ─── public API ─────────────────────────────────────────────────────

/**
 * Get the full Registry. Ordered fallback:
 *   1. In-pod LRU (instant)
 *   2. Redis HASH (fast, shared across pods)
 *   3. Build from sources (slow on cold start; single-flight via `cache()`)
 *
 * Never returns null — even with everything down, returns an empty Map
 * so callers don't have to null-check. An empty Registry means every URL
 * is `gone` from the lookup's perspective.
 */
export async function getRegistry(): Promise<Registry> {
  const lruHit = registryLru.get(REGISTRY_LRU_KEY);
  if (lruHit) return lruHit;

  const fromRedis = await loadFromRedis();
  if (fromRedis) {
    registryLru.set(REGISTRY_LRU_KEY, fromRedis, LRU_TTL_MS);
    return fromRedis;
  }

  try {
    const built = await buildOnce();
    registryLru.set(REGISTRY_LRU_KEY, built, LRU_TTL_MS);
    void saveToRedis(built);
    return built;
  } catch {
    return new Map();
  }
}

/**
 * Force a full rebuild from sources, atomic-swap into Redis, evict LRU
 * so the next read picks up the fresh copy. Called by `/api/tick?job=registry`.
 */
export async function rebuildRegistry(): Promise<{ size: number }> {
  const reg = await buildRegistry();
  registryLru.set(REGISTRY_LRU_KEY, reg, LRU_TTL_MS);
  await saveToRedis(reg);
  return { size: reg.size };
}

/**
 * Synchronous-ish lookup for hot paths (page resolvers). Loads the full
 * Registry once via getRegistry(), then queries it.
 */
export async function lookup(url: string): Promise<UrlEntry | null> {
  const reg = await getRegistry();
  return reg.get(url.toLowerCase()) ?? null;
}

/**
 * Lookup that avoids loading the entire Registry. Reads single-key from
 * Redis HASH (fast), or returns null if Redis is empty/down. Useful for
 * middleware that only needs to check a single URL per request and can
 * tolerate "I don't know yet" by passing through.
 */
export async function lookupFast(url: string): Promise<UrlEntry | null> {
  const lruReg = registryLru.get(REGISTRY_LRU_KEY);
  if (lruReg) return lruReg.get(url.toLowerCase()) ?? null;

  const value = await redisHGet(REDIS_KEY, url.toLowerCase());
  if (!value) return null;
  try {
    return JSON.parse(value) as UrlEntry;
  } catch {
    return null;
  }
}

/**
 * Tri-state lookup for hot paths (middleware) that need to distinguish
 * "URL definitely doesn't exist" from "I don't know yet (Registry not
 * warm)". Without this, middleware can't safely 404 unknown coins —
 * doing so during cold start would 404 valid coins until cron warms.
 *
 *   `entry`         — the registry record if found
 *   `registryWarm`  — true when we've confirmed the registry is populated
 *                     (LRU has it, OR Redis HASH exists for the key)
 *
 * Cost: at worst one Redis EXISTS round-trip + one HGET. Both are
 * sub-millisecond and the breaker short-circuits the EXISTS when Redis
 * is down — same fail-open behaviour as the rest of the cache layer.
 */
export async function lookupFastWithFreshness(
  url: string,
): Promise<{ entry: UrlEntry | null; registryWarm: boolean }> {
  const lruReg = registryLru.get(REGISTRY_LRU_KEY);
  if (lruReg) {
    return {
      entry: lruReg.get(url.toLowerCase()) ?? null,
      registryWarm: true,
    };
  }

  const lc = url.toLowerCase();
  const [exists, value] = await Promise.all([
    redisExists(REDIS_KEY),
    redisHGet(REDIS_KEY, lc),
  ]);

  if (value) {
    try {
      return { entry: JSON.parse(value) as UrlEntry, registryWarm: true };
    } catch {
      return { entry: null, registryWarm: exists };
    }
  }
  return { entry: null, registryWarm: exists };
}
