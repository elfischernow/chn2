import type { Block } from '@/lib/api/content/types';

/**
 * Default block fixtures used when the admin returns an empty or partial
 * page. Order matters — the renderer trusts the array order. Components
 * not present in the API response get appended in this sequence; ones
 * already in the API keep their admin-controlled position.
 *
 * "Always-on" blocks (`contact-support`, `start-exchange`) stay at the
 * very end so they're guaranteed to render even when the admin disabled
 * everything else.
 */

interface DefaultBlock extends Block {
  alwaysOn?: boolean;
}

/**
 * Pair-only defaults appended after the coin defaults when rendering a
 * pair page. The /litecoin/dogecoin probe showed prod renders the full
 * block stack even when the pair has no Strapi record — the pug template
 * + always-on logic on the legacy SPA emits these unconditionally.
 *
 * Order mirrors the prod h2 sequence (price-chart → market-data → why →
 * how-to → exchange-rate → calculator → other-options → currencies-table
 * → faq → sell-support).
 */
export const DEFAULT_PAIR_EXTRA_BLOCKS: DefaultBlock[] = [
  { __component: 'currency-flow.price-chart', id: -10, is_enabled: true },
  { __component: 'currency-flow.currency-pair-coin-market-data', id: -11, is_enabled: true },
  { __component: 'currency-flow.why-exchange-on-change-now', id: -12, is_enabled: true },
  { __component: 'currency-flow.how-to', id: -13, is_enabled: true },
  { __component: 'currency-flow.exchange-rate', id: -14, is_enabled: true },
  { __component: 'currency-flow.price-calculator-vertical', id: -15, is_enabled: true },
  { __component: 'currency-flow.other-options-to-buy', id: -16, is_enabled: true },
  { __component: 'currency-flow.faq', id: -17, is_enabled: true },
  // Pair pages get the extra cross-link tail blocks (prod renders them on
  // pair pages but skips on coin pages — keeps coin tail focused on
  // sell-support + news).
  { __component: 'currency-flow.useful-links', id: -18, is_enabled: true },
  { __component: 'currency-flow.explore-and-exchange-crypto', id: -19, is_enabled: true },
];

export const DEFAULT_COIN_BLOCKS: DefaultBlock[] = [
  // Live price chart (recharts via Cryptorank, TradingView fallback).
  // Sorted to the very top of the body via COIN_SORT_ORDER, just under
  // the hero — same slot prod uses.
  { __component: 'currency-flow.price-chart', id: -8, is_enabled: true },
  // Mid-page anchor: lets the user jump straight to "exchange this coin"
  // without scrolling past the explanatory copy.
  { __component: 'currency-flow.start-exchange', id: -1, is_enabled: true },
  // The catalog-table block reuses the listing UI to surface counter-coins.
  { __component: 'currency-flow.currencies-table', id: -2, is_enabled: true },
  // SEO tail — only `sell-support` and `latest-news` appear on prod's
  // coin pages. `useful-links` and `explore-and-exchange-crypto` are
  // pair-only on prod (kept here as registered blocks but not in the
  // coin defaults; pair-page defaults add them).
  { __component: 'currency-flow.sell-support', id: -7, is_enabled: true },
  { __component: 'currency-flow.latest-news', id: -4, is_enabled: true },
  // `contact-support` was here as an `alwaysOn` strip but it duplicated
  // the CTA already in `sell-support` (same "Contact support →" button,
  // back-to-back on the page). Removed from defaults; the block is still
  // registered for any surface that wants it explicitly.
];

/**
 * Merge admin-provided blocks with defaults. Rules (port of legacy
 * `getMergedDynamicZoneBlocks` + `getMergedBlocksWithAlwaysOn`):
 *
 *  1. Any block present in the API wins (admin order is preserved).
 *  2. Defaults whose `__component` isn't in the API are appended in the
 *     order they appear in DEFAULT_COIN_BLOCKS.
 *  3. `alwaysOn` defaults are always appended (even if admin disabled
 *     them in the API, we still render the default version).
 */
/**
 * Canonical block order — port of legacy `get-currency-single-page.js:547-560`.
 * The admin's API order is NOT respected; this array dictates the visible
 * sequence on every coin/pair page so SEO crawlers see the same outline
 * across the catalog.
 *
 * `contact-support` is deliberately omitted — `sell-support` already
 * surfaces a contact CTA in the same band of the page, and rendering both
 * back-to-back was the most-flagged regression in the prod-vs-local
 * audit. The component is still registered (other surfaces can use it),
 * just not part of the canonical coin/pair flow.
 *
 * Components NOT listed here sort to the end. Within "unknown" group,
 * original array order is preserved.
 */
const COIN_SORT_ORDER: string[] = [
  'currency-flow.supported-networks',
  'currency-flow.price-chart',
  'currency-flow.market-info',
  'currency-flow.start-exchange',
  'currency-flow.why-exchange-on-change-now',
  'currency-flow.exchange-advantages',
  'currency-flow.currencies-table',
  'currency-flow.sell-support',
  'currency-flow.what-is',
  'currency-flow.popular-fiat-markets',
  'currency-flow.most-visited-cryptocurrencies',
  'currency-flow.latest-news',
  'currency-flow.faq',
  // Pair-specific slots that should appear before generic tail.
  'currency-flow.currency-pair-coin-market-data',
  'currency-flow.exchange-rate',
  'currency-flow.price-calculator-vertical',
  'currency-flow.how-to',
  'currency-flow.other-options',
  'currency-flow.other-options-to-buy',
];

function sortByCanonical(blocks: Block[]): Block[] {
  const indexFor = (c: string) => {
    const i = COIN_SORT_ORDER.indexOf(c);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  return blocks
    .map((b, originalIdx) => ({ b, originalIdx }))
    .sort((x, y) => {
      const ix = indexFor(x.b.__component);
      const iy = indexFor(y.b.__component);
      if (ix !== iy) return ix - iy;
      // Stable for same-tier (incl. all "unknown" blocks).
      return x.originalIdx - y.originalIdx;
    })
    .map(({ b }) => b);
}

export function mergeBlocks(apiBlocks: Block[], pageType: 'coin' | 'pair' = 'coin'): Block[] {
  const present = new Set(apiBlocks.map((b) => b.__component));
  const out: Block[] = [...apiBlocks];
  const defaults =
    pageType === 'pair'
      ? [...DEFAULT_COIN_BLOCKS, ...DEFAULT_PAIR_EXTRA_BLOCKS]
      : DEFAULT_COIN_BLOCKS;
  for (const def of defaults) {
    const { alwaysOn, ...block } = def;
    if (alwaysOn) {
      // Drop the API copy if any, then re-add the default — guarantees a
      // contact-support block at the bottom even when admin disabled it.
      const idx = out.findIndex((b) => b.__component === block.__component);
      if (idx >= 0) out.splice(idx, 1);
      out.push(block);
      continue;
    }
    if (!present.has(block.__component)) out.push(block);
  }
  return sortByCanonical(out);
}
