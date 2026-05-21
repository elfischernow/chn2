// Promo-code helpers — discount constants + format check + display
// utilities. The actual validation now rides on the estimate response's
// `provider.promoCode` field (see `lib/api/exchange.ts`), mirroring the
// legacy SPA's `estimatePromoCodeSelector` — sending `promoCode` to
// `/v1.7/exchange/estimate` returns the verdict inline. No separate
// `/promo-codes/{hash}` round-trip is needed (and the dashboard endpoint
// is unreliable across environments).

// Legacy: `react-ssr/constants/promo-code-discounts.js`. Values are the
// fraction of the receive-amount the upstream deducts when the promo is
// applied (legacy formula: `amount * (discount / 100)`). PROMO_CODE_TEXTS
// is the human-facing label (50 / 20) the button copy quotes.
export const PROMO_CODE_DISCOUNTS: Record<string, number> = {
  key_50: 0.5,
  key_20: 0.2,
};

export const PROMO_CODE_TEXTS: Record<string, number> = {
  key_50: 50,
  key_20: 20,
};

/** Same shape the legacy `mapFn` returns. The estimate response's
 *  `provider.promoCode` is normalized to this in `fetchEstimate`. */
export interface PromoCodeValidation {
  hash: string | null;
  isValid: boolean;
  isExpired: boolean;
  /** `'key_50'` / `'key_20'` — keys into `PROMO_CODE_DISCOUNTS`. */
  type: string | null;
  maxUses: number;
  uses: number;
  usesLeft: number;
  /** Upstream-surfaced error code or message. Non-null when the upstream
   *  rejected the code (expired / wrong / unknown). */
  error: string | null;
}

const PROMO_CODE_FORMAT = /^[A-Z0-9]{12}$/;

export const isPromoCodeFormatValid = (raw: string): boolean =>
  PROMO_CODE_FORMAT.test(raw);

/** Returns the discount fraction (0..1) for a successfully-validated promo,
 *  or `null` when the validation is missing / invalid / unrecognised type.
 *  Mirrors the legacy `inputValue * (discount / 100)` formula by dividing
 *  by 100 here so the caller can apply the result as a direct multiplier. */
export function promoDiscountFraction(
  v: PromoCodeValidation | null,
): number | null {
  if (!v || !v.isValid || !v.type) return null;
  const raw = PROMO_CODE_DISCOUNTS[v.type];
  if (raw == null) return null;
  return raw / 100;
}

/** Display percentage (e.g. `50`) for a validated promo. `null` when the
 *  promo isn't valid or its type isn't recognised. */
export function promoDiscountPercent(
  v: PromoCodeValidation | null,
): number | null {
  if (!v || !v.isValid || !v.type) return null;
  return PROMO_CODE_TEXTS[v.type] ?? null;
}
