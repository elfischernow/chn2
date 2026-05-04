/** Subset of the Private transfer mode's URL state — recipient address +
 *  optional memo/destination-tag for chains that require one. Empty-string
 *  values are persisted intentionally so the field can be cleared via
 *  deep link. */
export interface PrivateHashSlice {
  address?: string;
  extraId?: string;
}

export const privateHash = {
  parse(params: URLSearchParams): PrivateHashSlice {
    const out: PrivateHashSlice = {};
    const addr = params.get('address');
    if (addr != null) out.address = addr;
    const xid = params.get('extraId');
    if (xid != null) out.extraId = xid;
    return out;
  },
  write(slice: PrivateHashSlice): Record<string, string> {
    const out: Record<string, string> = {};
    if (slice.address) out.address = slice.address;
    if (slice.extraId) out.extraId = slice.extraId;
    return out;
  },
};
