/**
 * Pure-types module — safe to import from client components. The server
 * fetcher / id-map lives next to it in `index.ts` and pulls these in.
 */

export interface SparklinePoint {
  /** Unix-millis timestamp. */
  timestamp: number;
  price: number;
}

export type SparklineRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '2Y';

export const SPARKLINE_RANGES: SparklineRange[] = ['1D', '1W', '1M', '3M', '1Y', '2Y'];

/**
 * Listing row from `/currencies?sortBy=rank` — the proxy returns ~30 fields
 * per coin, we only surface what the homepage rates board needs. Keep the
 * shape narrow so future callers don't grow accidental dependencies on
 * Cryptorank-internal fields that may move.
 */
export interface TopCurrency {
  id: number;
  symbol: string;
  name: string;
  rank: number | null;
  price: number;
  marketCap: number | null;
  volume24h: number | null;
  iconUrl: string | null;
  /** Slug used by the cryptorank URL space (e.g. `bitcoin`, `ethereum`). */
  key: string;
}
