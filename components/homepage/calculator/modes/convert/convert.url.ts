import type { ConvMode } from '../../shared/types';

/** Subset of the Convert mode's URL state — the `sub` param picks between
 *  market/fixed/limit. */
export interface ConvertHashSlice {
  sub?: ConvMode;
}

export const convertHash = {
  parse(params: URLSearchParams): ConvertHashSlice {
    const sub = params.get('sub');
    return sub === 'market' || sub === 'fixed' || sub === 'limit' ? { sub } : {};
  },
  write(slice: ConvertHashSlice): Record<string, string> {
    return slice.sub ? { sub: slice.sub } : {};
  },
};
