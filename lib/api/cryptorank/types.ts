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
