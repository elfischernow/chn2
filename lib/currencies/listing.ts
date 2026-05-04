import 'server-only';

import type { Currency } from '../api/currencies';

/**
 * Listing-page filtering, sorting and pagination. Server-only because
 * the listing page is rendered server-side (SSR contract from Q4: must
 * work with JS off, so the table is in the HTML at first byte).
 *
 * Search: simple substring on `name | ticker | currentTicker`. We don't
 * use the Levenshtein ranker from `lib/currencies/search.ts` here — that
 * one matches the calculator's combobox semantics, where the legacy spec
 * uses the smarter ranker. For the public listing the legacy uses simple
 * `indexOf` (see `currencies-table/helpers.js#filteredDataWithSearch`),
 * and we mirror that for behaviour parity (and to keep the bundle slim
 * since search runs in a server route handler at most).
 */

export type ListingSort = 'rank' | 'abc';

export interface ListingOptions {
  q?: string;
  sort?: ListingSort;
  page?: number;
  perPage?: number;
}

export interface ListingResult {
  rows: Currency[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

const DEFAULT_PER_PAGE = 50;

function matches(c: Currency, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    c.name.toLowerCase().includes(q) ||
    c.ticker.includes(q) ||
    c.currentTicker.includes(q)
  );
}

function rankSort(a: Currency, b: Currency): number {
  if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
  if (a.isPopularFiat !== b.isPopularFiat) return a.isPopularFiat ? -1 : 1;
  if (a.position !== b.position) return a.position - b.position;
  return a.name.localeCompare(b.name);
}

function abcSort(a: Currency, b: Currency): number {
  return a.name.localeCompare(b.name);
}

export function applyListing(
  items: readonly Currency[],
  opts: ListingOptions = {},
): ListingResult {
  const perPage = opts.perPage && opts.perPage > 0 ? opts.perPage : DEFAULT_PER_PAGE;
  const sort: ListingSort = opts.sort === 'abc' ? 'abc' : 'rank';
  const q = opts.q ?? '';

  const filtered = q ? items.filter((c) => matches(c, q)) : items.slice();
  filtered.sort(sort === 'abc' ? abcSort : rankSort);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const requestedPage = Number.isFinite(opts.page) && (opts.page ?? 0) > 0 ? Math.floor(opts.page!) : 1;
  // Don't clamp silently — callers (page handlers) decide whether to
  // notFound() for over-shoot. We just compute what's at the requested page.
  const start = (requestedPage - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  return { rows, total, totalPages, page: requestedPage, perPage };
}

/** Page > NOINDEX_PAGE_FROM gets `noindex,follow` for crawl-budget. */
export const NOINDEX_PAGE_FROM = 10;
