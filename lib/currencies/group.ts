import type { Currency } from '@/lib/api/currencies';

/**
 * A flattened picker row — a group-header label string, or a currency item.
 * Mirrors the legacy SPA's merged-list shape: keyboard nav iterates this
 * array directly and skips strings; virtualization (when we need it) can
 * index into it without a separate header model.
 */
export type CurrencyRow = string | Currency;

export type CurrencyExclude = (c: Currency) => boolean;

/**
 * Bucket a flat currency list into the picker's group view. Each currency
 * appears in exactly one bucket — Popular > Stablecoins > All — to avoid the
 * legacy duplication where popular tokens showed up twice. `exclude` (the
 * other side of the swap) is dropped entirely.
 */
export function groupCurrencies(
  list: readonly Currency[],
  exclude?: CurrencyExclude,
): CurrencyRow[] {
  const popular: Currency[] = [];
  const stable: Currency[] = [];
  const rest: Currency[] = [];

  for (const c of list) {
    if (exclude?.(c)) continue;
    if (c.isPopular) popular.push(c);
    else if (c.isStable) stable.push(c);
    else rest.push(c);
  }

  const rows: CurrencyRow[] = [];
  if (popular.length) {
    rows.push('Popular');
    rows.push(...popular);
  }
  if (stable.length) {
    rows.push('Stablecoins');
    rows.push(...stable);
  }
  if (rest.length) {
    rows.push('All');
    rows.push(...rest);
  }
  return rows;
}

/**
 * The "search results" shape — a single header + ranked items. Matches the
 * grouped contract so the picker only needs to render one row type.
 */
export function searchRows(items: readonly Currency[]): CurrencyRow[] {
  if (items.length === 0) return [];
  return ['Results', ...items];
}
