// Helpers for the homepage SwapWidget's Convert / Limit sub-mode. Mirror
// the legacy SPA's `should-reverse-display.ts` so the rate quote naturally
// reads "1 EXPENSIVE = X CHEAP" instead of the other way around — fewer
// significant digits, less mental gymnastics.

import type { Currency } from './api/currencies';

/**
 * Top-of-book bases. Same list (and ordering) the legacy SPA carries in
 * its `PRIORITY_LIMIT_RATE_COINS` env var. The first entry is the highest
 * priority — when both sides of a pair appear in the list, the one with
 * the lower index "wins" and gets quoted as the base ("1 BTC = X ETH").
 */
export const PRIORITY_LIMIT_RATE_COINS: readonly string[] = [
  'BTC',
  'ETH',
  'BNB',
  'XMR',
  'SOL',
  'LTC',
  'HYPE',
  'XRP',
];

/**
 * Returns `true` when the rate should be displayed as `1 TO = X FROM`
 * (i.e., display direction is reversed from the underlying FROM→TO order).
 *
 * Rules — match the legacy `shouldReverseDisplay`:
 * 1. Stable on FROM, volatile on TO → reverse (so the volatile asset is
 *    the base; quoting "1 ETH = 3500 USDT" is more readable than
 *    "1 USDT = 0.000286 ETH").
 * 2. Stable on TO, volatile on FROM → don't reverse.
 * 3. Both sides in the priority list → reverse if FROM is lower-priority
 *    (higher index) so the higher-priority coin becomes the base.
 * 4. Only one side in the list → keep that one as the base.
 * 5. Neither in list → don't reverse (caller picks the default).
 */
export function shouldReverseDisplay(
  from: Pick<Currency, 'currentTicker' | 'isStable'> | null | undefined,
  to: Pick<Currency, 'currentTicker' | 'isStable'> | null | undefined,
): boolean {
  if (from?.isStable && !to?.isStable) return true;
  if (!from?.isStable && to?.isStable) return false;

  const fromIdx = from ? PRIORITY_LIMIT_RATE_COINS.indexOf(from.currentTicker.toUpperCase()) : -1;
  const toIdx = to ? PRIORITY_LIMIT_RATE_COINS.indexOf(to.currentTicker.toUpperCase()) : -1;

  const fromInList = fromIdx !== -1;
  const toInList = toIdx !== -1;

  if (fromInList && !toInList) return false;
  if (!fromInList && toInList) return true;
  if (fromInList && toInList) return fromIdx > toIdx;

  return false;
}
