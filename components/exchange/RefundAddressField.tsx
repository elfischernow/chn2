'use client';

import { useState } from 'react';

import { WalletAddressField } from './WalletAddressField';

interface RefundAddressFieldProps {
  /** Source-currency ticker — refunds go back to the deposit chain, so
   *  the address regex / label tracks the FROM currency. */
  ticker: string;
  /** Validator for the source chain. */
  addressRegex?: string | null;
  value: string;
  onChange: (next: string) => void;
  /** When true (anonymous-from coins like XMR / shielded ZEC), the
   *  upstream insists on a refund address before the transaction can be
   *  created. The disclosure opens automatically and the toggle is
   *  locked open so the user can't dismiss it. */
  required: boolean;
}

/**
 * Refund-address disclosure — collapsed "Add refund address" trigger
 * that reveals a `WalletAddressField` typed for the FROM chain. Refund
 * addresses are optional for every coin (the upstream will skip the
 * refund silently if it's missing), but anonymous-from coins (privacy
 * coins, mixers) reject the create-transaction without one — for those
 * the disclosure auto-opens and the trigger locks.
 *
 * Mirrors the legacy `NewStepperBackupField` UX which sat inline for
 * anonymous coins and inside the "Advanced settings" dropdown otherwise.
 * This version keeps the same conditional behaviour but flattens the
 * nesting — the disclosure trigger sits as a sibling of the promo-code
 * trigger and the agreements / CTA, not buried in a generic "More
 * options" panel.
 */
export function RefundAddressField({
  ticker,
  addressRegex,
  value,
  onChange,
  required,
}: RefundAddressFieldProps) {
  const [open, setOpen] = useState(false);
  // Force-open when the upstream needs it OR when the user already has
  // a value (deep-link / session-storage restore).
  const expanded = open || required || value.length > 0;

  if (!expanded) {
    return (
      <button
        type="button"
        className="ex-refund-trigger"
        onClick={() => setOpen(true)}
      >
        Add refund address
      </button>
    );
  }

  return (
    <div className="ex-refund">
      <div className="ex-refund-head">
        <span className="ex-refund-title">
          Refund address {required && <span className="ex-field-req">· required</span>}
        </span>
        {!required && (
          // Toggle stays available when refund is optional so the user
          // can collapse the field after deciding not to use it.
          <button
            type="button"
            className="ex-refund-toggle"
            onClick={() => {
              setOpen(false);
              onChange('');
            }}
          >
            Remove
          </button>
        )}
      </div>
      <WalletAddressField
        ticker={ticker}
        label={`Enter the ${ticker} refund address`}
        addressRegex={addressRegex}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
