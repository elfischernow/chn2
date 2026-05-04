/**
 * Shared types used across the calculator's per-mode adapters and the
 * top-level orchestrator. Each mode owns its own state shape (defined
 * alongside its adapter); the types in this file are the cross-mode
 * primitives that show up in more than one place.
 */

/** Identifiers for the four functional modes. The widget's "More" menu
 *  surfaces additional placeholder ids (loans, perps, bridge, stake) that
 *  don't have their own flows yet — those live as a wider local type in
 *  `SwapWidget` and are not part of the registry. */
export type ModeId = 'swap' | 'buysell' | 'convert' | 'private';

/** Buy/Sell tab direction toggle. Drives default ticker selection on tab
 *  open (USD→BTC vs BTC→EUR) and the "You pay" / "You sell" eyebrow. */
export type FiatDir = 'buy' | 'sell';

/** Swap tab rate-commitment toggle. */
export type RateUI = 'fixed' | 'floating';

/** Convert tab sub-mode. Mirrors the legacy SPA's market/fixed/limit
 *  trade calculator. */
export type ConvMode = 'market' | 'fixed' | 'limit';
