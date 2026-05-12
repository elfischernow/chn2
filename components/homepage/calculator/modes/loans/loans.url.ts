/** Loans-mode URL slice. Currently empty — the cross-mode params
 *  (from/to/amount/networks) and `mode=loans` itself are handled by the
 *  orchestrator. `ltv` is reserved for when we surface a loan-to-value
 *  toggle; until then the calculator hardcodes 0.5 and we don't write
 *  it into the URL. */
export interface LoansHashSlice {
  /** Decimal LTV (0.5 = 50%). Optional — defaulted by the calculator. */
  ltv?: number;
}

export const loansHash = {
  parse(params: URLSearchParams): LoansHashSlice {
    const out: LoansHashSlice = {};
    const raw = params.get('ltv');
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && n < 1) out.ltv = n;
    }
    return out;
  },
  write(slice: LoansHashSlice): Record<string, string> {
    const out: Record<string, string> = {};
    if (slice.ltv != null && slice.ltv !== 0.5) {
      out.ltv = String(slice.ltv);
    }
    return out;
  },
};
