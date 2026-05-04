import { useState } from 'react';

import { parseStrictNumber } from './limit-math';

export interface UseLimitStateOpts {
  /** `${from}-${to}` — used to invalidate user-typed prices when the pair
   *  changes (a "5% above ETH→USDT" target shouldn't carry into ETH→BTC).
   *  Pair-tagged state expires by tag mismatch on the next render — no
   *  effect-driven reset. */
  pairTag: string;
  /** Live market rate in direct direction (TO per 1 FROM). `null` until
   *  the first estimate lands. */
  marketRate: number | null;
  /** `shouldReverseDisplay(fromCurrency, toCurrency)` — heuristic for
   *  which side of the pair is the natural base. The user can override
   *  via the reverse button; this is just the starting orientation. */
  defaultInverse: boolean;
}

export interface LimitState {
  /** Display orientation. `false` → "Sell price for 1 FROM", `true` →
   *  "Buy price for 1 TO". */
  isInverse: boolean;
  setIsInverse: (v: boolean) => void;
  /** User's typed text in display direction. `null` = untouched, fall
   *  back to the seed (5% above market). */
  limitRaw: string | null;
  setLimitRaw: (raw: string) => void;
  /** Reset both the raw text AND the pair tag — next render reads as
   *  "untouched" so the seed reappears. */
  resetToMarket: () => void;
  /** 5%-above-market seed in display direction — reseeded per pair. */
  seedDisplay: number | null;
  /** Display-direction view of the user's typed value (or seed). */
  displayNum: number | null;
  /** Display-direction view of the live market rate
   *  (= `1 / marketRate` when inverse). */
  displayMarket: number | null;
  /** Direct-direction price (TO per 1 FROM). Used by amount math + the
   *  below-market guard regardless of orientation — flipping the display
   *  preserves the inequality. */
  directNum: number | null;
}

/**
 * Owns the limit-price field's state — pair-tagged so the user's typed
 * value (and reverse-direction override) auto-expires on pair change
 * without a separate effect. Returns the state plus all the derived
 * numbers the parent + the LimitPriceField component need (display vs.
 * direct direction, market reference, seed).
 *
 * Stays unconditionally called even outside Convert+Limit mode: the cost
 * is two `useState` cells with default values, and keeping the call
 * unconditional means the user's typed price survives a tab switch back
 * to Convert.
 */
export function useLimitState({
  pairTag,
  marketRate,
  defaultInverse,
}: UseLimitStateOpts): LimitState {
  // Source-of-truth — stores the user's literal field text in the
  // *display* direction so re-rendering never reformats mid-keystroke
  // (the previous design round-tripped through 1/x → format → 1/x →
  // format, which clobbered fractional digits and bounced the cursor on
  // every input event). `raw === null` means "user hasn't typed anything
  // for this pair, follow the market-anchored seed"; `raw === ''` means
  // they typed and cleared. The pair tag stamps which (from,to) the
  // value applies to so when the user changes a ticker the stored value
  // reads as "untouched" on the next render.
  const [limitInput, setLimitInputState] = useState<{ raw: string | null; pair: string }>({
    raw: null,
    pair: '',
  });
  // Inverse-display override, also pair-tagged. `value: null` means "use
  // the shouldReverseDisplay default for this pair" — the user hasn't
  // manually overridden the auto-pick yet.
  const [limitInverse, setLimitInverseState] = useState<{
    value: boolean | null;
    pair: string;
  }>({ value: null, pair: '' });

  const isInverse =
    limitInverse.pair === pairTag && limitInverse.value != null
      ? limitInverse.value
      : defaultInverse;
  const setIsInverse = (value: boolean) => setLimitInverseState({ value, pair: pairTag });

  const limitRaw = limitInput.pair === pairTag ? limitInput.raw : null;
  const setLimitRaw = (raw: string) => setLimitInputState({ raw, pair: pairTag });
  const resetToMarket = () => setLimitInputState({ raw: null, pair: '' });

  // Direct-direction seed = "5% above market" (favorable to seller). The
  // displayed seed flips with `isInverse` so the field always reads as a
  // user-favorable starting point in either orientation.
  const seedDisplay =
    marketRate != null && marketRate > 0
      ? isInverse
        ? 1 / (marketRate * 1.05)
        : marketRate * 1.05
      : null;

  const displayNum: number | null =
    limitRaw != null ? parseStrictNumber(limitRaw) : seedDisplay;

  // Convert the display number back to direct so amount math + below-
  // market checks stay direction-agnostic. Single conversion, no
  // compounding.
  const directNum: number | null =
    displayNum != null && displayNum > 0
      ? isInverse
        ? 1 / displayNum
        : displayNum
      : null;

  const displayMarket =
    marketRate != null && marketRate > 0 ? (isInverse ? 1 / marketRate : marketRate) : null;

  return {
    isInverse,
    setIsInverse,
    limitRaw,
    setLimitRaw,
    resetToMarket,
    seedDisplay,
    displayNum,
    displayMarket,
    directNum,
  };
}
