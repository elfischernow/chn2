/**
 * Shared types used across the calculator's per-mode adapters and the
 * top-level orchestrator. Each mode owns its own state shape (defined
 * alongside its adapter); the types in this file are the cross-mode
 * primitives that show up in more than one place.
 */

/** Identifiers for the functional modes that have a real per-mode view
 *  and URL adapter. The widget's "More" menu surfaces additional
 *  placeholder ids (perps, bridge, stake) that don't have their own
 *  flows yet — those live as a wider local type in `SwapWidget` and are
 *  not part of the registry. Loans is in More by user preference but
 *  has a full implementation; it's a real mode, not a placeholder. */
export type ModeId = 'swap' | 'buysell' | 'convert' | 'private' | 'loans';

/** Buy/Sell tab direction toggle. Drives default ticker selection on tab
 *  open (USD→BTC vs BTC→EUR) and the "You pay" / "You sell" eyebrow. */
export type FiatDir = 'buy' | 'sell';

/** Swap tab rate-commitment toggle. */
export type RateUI = 'fixed' | 'floating';

/** Convert tab sub-mode. Mirrors the legacy SPA's market/fixed/limit
 *  trade calculator. */
export type ConvMode = 'market' | 'fixed' | 'limit';
