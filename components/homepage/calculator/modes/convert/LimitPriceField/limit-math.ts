import { DECIMAL_RE } from '../../../shared/utils';

/** Strict numeric parse for user-typed amounts. Returns `null` for any
 *  string that isn't a finite, positive decimal — including transient
 *  states like `""` or `"0."`. `Number(s)` is stricter than `parseFloat`
 *  (rejects trailing junk and scientific notation when paired with the
 *  regex check below), so we use the two together. */
export const parseStrictNumber = (s: string): number | null => {
  if (s === '' || !DECIMAL_RE.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

/** Round the limit price to a digit count that visually matches the field
 *  size — fewer decimals on whole-number rates like ETH→USDT, more on tiny
 *  unit prices like KISHU→ETH. Mirrors how `formatAmount` steps precision. */
export const formatLimitPrice = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(2);
  if (abs >= 1) return n.toFixed(3);
  if (abs >= 0.001) return n.toFixed(5);
  return n.toFixed(8);
};

/**
 * Same idea as `amountSizeAttr` but tighter breakpoints — the limit-price
 * row renders at 22px (vs 32px for the main amount fields) and shares the
 * row with the inline ticker + three pct buttons, so it has much less
 * horizontal headroom before the long-number case starts pushing layout.
 */
export const limAmountSize = (raw: string): 'md' | 'sm' | 'xs' | undefined => {
  const len = raw.length;
  if (len > 14) return 'xs';
  if (len > 11) return 'sm';
  if (len > 8) return 'md';
  return undefined;
};

/**
 * Implied "You buy" amount at the user's limit price — `fromAmount ×
 * directPrice`. Mirrors the legacy `amountTo = amountFrom * directPrice`
 * calc and keeps the receive field honest about what the order would
 * actually fill at, instead of showing whatever the live market estimate
 * happens to be. Returns `null` when either input isn't a usable positive
 * number.
 */
export function impliedFromTo(fromAmount: string, directPrice: number | null): number | null {
  if (directPrice == null || directPrice <= 0) return null;
  const fromNum = parseStrictNumber(fromAmount);
  if (fromNum == null || fromNum <= 0) return null;
  const out = fromNum * directPrice;
  return Number.isFinite(out) ? out : null;
}
