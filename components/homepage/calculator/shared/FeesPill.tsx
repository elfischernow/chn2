'use client';

import { formatAmount } from './format';

interface FeesPillProps {
  /** When provided, surface a "Network fee" row in the breakdown
   *  tooltip. Crypto modes pass `{ amount, ticker }`; fiat on-ramps
   *  quote one all-in price so the withdrawal-fee line would be
   *  misleading and the prop is omitted. `amount === null` renders the
   *  row with `—` (estimate not yet loaded). */
  networkFee?: { amount: number | null; ticker: string };
  /** Active promo-code discount percent (e.g. `50`). When set the pill
   *  swaps its "Fees included" copy for "{X}% Promo applied" and gets
   *  the brand promo gradient — mirrors the legacy `gradientButtonText`
   *  treatment but inlined on the pill itself. */
  promoPercent?: number | null;
}

/**
 * "Fees included" pill that sits in the TO field's label slot. Hover or
 * focus reveals a breakdown tooltip — network fee (where applicable),
 * service fee, spread/slippage. Visual chrome only; the actual fee
 * numbers come from the upstream estimate, computed by the caller.
 *
 * When `promoPercent` is set the pill flips into the "promo applied"
 * state: the label changes to "{X}% Promo applied", the icon switches
 * to the promo tag, and the tooltip surfaces the discount as the headline.
 */
export function FeesPill({ networkFee, promoPercent = null }: FeesPillProps) {
  const isPromo = promoPercent != null && promoPercent > 0;
  return (
    <span
      className="fees-pill"
      data-promo={isPromo || undefined}
      tabIndex={0}
      aria-label={
        isPromo ? `${promoPercent}% promo applied` : 'Fees included details'
      }
    >
      <span>
        {isPromo ? `${promoPercent}% Promo applied` : 'Fees included'}
      </span>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span className="fees-tip" role="tooltip">
        <span className="fees-tip-title">
          {isPromo ? 'Promo discount applied' : 'No hidden fees'}
        </span>
        {isPromo && (
          <span className="fees-tip-row">
            <span>Promo discount</span>
            <span>{promoPercent}%</span>
          </span>
        )}
        {networkFee && (
          <span className="fees-tip-row">
            <span>Network fee</span>
            <span>
              {networkFee.amount != null
                ? `${formatAmount(networkFee.amount)} ${networkFee.ticker}`
                : '—'}
            </span>
          </span>
        )}
        <span className="fees-tip-row">
          <span>Service fee</span>
          <span>0.4%</span>
        </span>
        <span className="fees-tip-row">
          <span>Spread &amp; slippage</span>
          <span>built-in</span>
        </span>
        <span className="fees-tip-foot">
          {isPromo
            ? 'Your promo code discount is already reflected in the receive amount.'
            : 'All fees are baked into the rate you see — what you get is what you get.'}
        </span>
      </span>
    </span>
  );
}
