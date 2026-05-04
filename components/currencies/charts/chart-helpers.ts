import type { SparklineRange } from '@/lib/api/cryptorank/types';

/**
 * Format a unix-millis timestamp for the X axis based on the active
 * window. Mirrors the legacy `format-x-axis` table: short windows show
 * time-of-day, long windows show month + year.
 */
export function formatXAxisTick(ts: number, range: SparklineRange): string {
  const d = new Date(ts);
  switch (range) {
    case '1D':
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case '1W':
      return d.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    case '1M':
    case '3M':
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    case '1Y':
    case '2Y':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  }
}

/** Long-form date for the tooltip + footer. */
export function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Y-axis label. Big numbers get `K/M/B` suffix; sub-dollar values keep
 * three significant digits so the axis reads cleanly on volatile coins.
 */
export function formatYAxisTick(value: number, withDollar = true): string {
  const sign = withDollar ? '$' : '';
  if (!Number.isFinite(value)) return `${sign}—`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(value / 1_000).toFixed(2)}K`;
  if (abs >= 1) return `${sign}${value.toFixed(2)}`;
  // Sub-dollar: three significant digits keeps the axis informative for
  // coins like SHIB or PEPE without wasting horizontal space.
  return `${sign}${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 }).format(value)}`;
}

/**
 * Tooltip price formatter. Larger precision than the axis tick so users
 * see the full number on hover.
 */
export function formatTooltipPrice(value: number, currencySymbol = '$'): string {
  if (!Number.isFinite(value)) return `${currencySymbol}—`;
  if (Math.abs(value) >= 1) {
    return `${currencySymbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
      value,
    )}`;
  }
  return `${currencySymbol}${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(
    value,
  )}`;
}

/**
 * Reduce the X-axis tick set to one per month for the long ranges so the
 * labels don't overlap. Ports the `getUniqueTicksList` heuristic from
 * legacy. For shorter ranges we let recharts auto-pick.
 */
export function pickUniqueTicks(
  data: Array<{ timestamp: number }>,
  range: SparklineRange,
): number[] | undefined {
  if (range !== '1Y' && range !== '2Y') return undefined;
  if (!data.length) return undefined;
  const seen = new Set<string>();
  const out: number[] = [];
  for (const p of data) {
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p.timestamp);
    }
  }
  return out;
}
