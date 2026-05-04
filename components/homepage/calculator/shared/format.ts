// Narrow no-break space — visible separator that won't break the line and
// reads as a thin gap rather than a glyph.
const THIN_SPACE = '\u202F';

const groupThousands = (intStr: string): string =>
  intStr.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);

/**
 * Format a positive decimal for the calculator's amount fields. Steps the
 * decimal precision down as the magnitude grows so a 6-figure USD amount
 * doesn't render as `123456.78901234` and a fractional satoshi amount
 * doesn't render as `0.00`. Trailing zeros after the point are stripped
 * so "1.5" renders as "1.5", not "1.5000". Thousands are separated with
 * a thin no-break space (matches the legacy SPA's number formatting).
 */
export const formatAmount = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  let str: string;
  if (abs >= 1000) str = n.toFixed(2);
  else if (abs >= 1) str = n.toFixed(4).replace(/\.?0+$/, '');
  else if (abs >= 0.001) str = n.toFixed(6).replace(/\.?0+$/, '');
  else str = n.toFixed(8).replace(/\.?0+$/, '');
  const dot = str.indexOf('.');
  if (dot < 0) return groupThousands(str);
  return groupThousands(str.slice(0, dot)) + str.slice(dot);
};

/**
 * Format a USD amount for the Pro upsell. Mirrors the legacy floor: when
 * the cashback computes to less than a cent we round up to `$0.01` so the
 * banner always shows a tangible figure rather than `$0.00`. Above $100
 * we drop the cents — they're noise next to a triple-digit headline.
 */
export const formatUsd = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n < 0.01) return '$0.01';
  if (n >= 100) return `$${Math.round(n)}`;
  return `$${n.toFixed(2)}`;
};
