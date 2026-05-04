'use client';

import { formatAmount } from './format';

interface FeesPillProps {
  /** When provided, surface a "Network fee" row in the breakdown
   *  tooltip. Crypto modes pass `{ amount, ticker }`; fiat on-ramps
   *  quote one all-in price so the withdrawal-fee line would be
   *  misleading and the prop is omitted. `amount === null` renders the
   *  row with `—` (estimate not yet loaded). */
  networkFee?: { amount: number | null; ticker: string };
}

/**
 * "Fees included" pill that sits in the TO field's label slot. Hover or
 * focus reveals a breakdown tooltip — network fee (where applicable),
 * service fee, spread/slippage. Visual chrome only; the actual fee
 * numbers come from the upstream estimate, computed by the caller.
 */
export function FeesPill({ networkFee }: FeesPillProps) {
  return (
    <span className="fees-pill" tabIndex={0} aria-label="Fees included details">
      <span>Fees included</span>
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
        <span className="fees-tip-title">No hidden fees</span>
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
          All fees are baked into the rate you see — what you get is what you get.
        </span>
      </span>
    </span>
  );
}
