'use client';

import { useId, useState } from 'react';

interface AdvancedFieldsProps {
  refundAddress: string;
  onRefundAddressChange: (next: string) => void;
  promoCode: string;
  onPromoCodeChange: (next: string) => void;
  /** When true, renders the refund-address field. Anonymous-from
   *  currencies (privacy coins, mixers) require a refund address per
   *  the upstream policy — when this is false the field stays out so
   *  the user isn't asked for a value the upstream will ignore. */
  refundRequired: boolean;
}

/**
 * Collapsible "More options" panel — refund address + promo code. Mirrors
 * the legacy `NewStepperDropdownSettings` UX where the same two values
 * sit behind a "Settings" disclosure to keep the primary form short.
 *
 * Refund address is force-revealed (and the panel auto-opens) when the
 * FROM currency requires it — otherwise opt-in via the disclosure
 * toggle below the address input.
 */
export function AdvancedFields({
  refundAddress,
  onRefundAddressChange,
  promoCode,
  onPromoCodeChange,
  refundRequired,
}: AdvancedFieldsProps) {
  const refundId = useId();
  const promoId = useId();
  const [open, setOpen] = useState(false);
  // Force-open whenever the active pair needs a refund address — the user
  // shouldn't have to dig through a panel to fill a required field.
  const expanded = open || refundRequired;

  return (
    <div className="ex-advanced">
      <button
        type="button"
        className="ex-advanced-toggle"
        aria-expanded={expanded}
        onClick={() => setOpen((o) => !o)}
        // Locked open while the refund address is required — the toggle
        // would otherwise let the user collapse a section that holds a
        // mandatory field.
        disabled={refundRequired}
      >
        <span>More options</span>
        <span className="ex-advanced-caret" aria-hidden>
          {expanded ? '▴' : '▾'}
        </span>
      </button>
      {expanded && (
        <div className="ex-advanced-body">
          {refundRequired || refundAddress ? (
            <div className="ex-field">
              <label className="ex-field-label" htmlFor={refundId}>
                Refund address {refundRequired && <span className="ex-field-req">·  required</span>}
              </label>
              <input
                id={refundId}
                className="ex-field-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Address to refund if the exchange fails"
                value={refundAddress}
                onChange={(e) => onRefundAddressChange(e.target.value)}
              />
            </div>
          ) : null}
          <div className="ex-field">
            <label className="ex-field-label" htmlFor={promoId}>
              Promo code
            </label>
            <input
              id={promoId}
              className="ex-field-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Have a promo code?"
              value={promoCode}
              onChange={(e) => onPromoCodeChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
