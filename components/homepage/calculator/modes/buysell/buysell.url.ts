import type { FiatDir } from '../../shared/types';

/** Subset of the Buy/Sell mode's URL state. `provider` lives here because
 *  it's only ever set when the FiatProviderStrip is visible (i.e. the user
 *  is on this tab); the orchestrator currently writes it under buysell-only
 *  to match. */
export interface BuySellHashSlice {
  fiatDir?: FiatDir;
  provider?: string;
}

export const buysellHash = {
  parse(params: URLSearchParams): BuySellHashSlice {
    const out: BuySellHashSlice = {};
    const fd = params.get('fiatDir');
    if (fd === 'buy' || fd === 'sell') out.fiatDir = fd;
    const p = params.get('provider');
    if (p) out.provider = p;
    return out;
  },
  write(slice: BuySellHashSlice): Record<string, string> {
    const out: Record<string, string> = {};
    if (slice.fiatDir) out.fiatDir = slice.fiatDir;
    if (slice.provider) out.provider = slice.provider;
    return out;
  },
};
