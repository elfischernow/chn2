import type { RateUI } from '../../shared/types';

/** Subset of the Swap mode's URL state — the params unique to this tab.
 *  Common fields (from/to/amount/dir/networks) are still owned by the
 *  orchestrator until later refactor steps lift state per mode. */
export interface SwapHashSlice {
  rate?: RateUI;
}

export const swapHash = {
  parse(params: URLSearchParams): SwapHashSlice {
    const r = params.get('rate');
    return r === 'fixed' || r === 'floating' ? { rate: r } : {};
  },
  write(slice: SwapHashSlice): Record<string, string> {
    return slice.rate ? { rate: slice.rate } : {};
  },
};
