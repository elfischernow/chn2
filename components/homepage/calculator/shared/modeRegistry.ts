import { buysellHash } from '../modes/buysell/buysell.url';
import { convertHash } from '../modes/convert/convert.url';
import { privateHash } from '../modes/private/private.url';
import { swapHash } from '../modes/swap/swap.url';

import type { ModeId } from './types';

/**
 * Per-mode adapter registry. Step 3 (skeleton) — each entry currently
 * carries only the URL hash adapter (`parse` + `write`) for the params
 * unique to that mode. Later steps will grow each entry with `getDefaults`,
 * `useState`, `View`, and the per-mode currency-picker filter — see
 * `calculator_architecture_plan.md`.
 *
 * Common URL params (from/to/amount/dir/networks) and the `mode=` key
 * itself are still handled inline by the orchestrator (`SwapWidget`); only
 * mode-specific slices flow through these adapters.
 */
export const MODE_REGISTRY = {
  swap: swapHash,
  buysell: buysellHash,
  convert: convertHash,
  private: privateHash,
} satisfies Record<ModeId, unknown>;
