'use client';

import { useId, useState } from 'react';

interface ExtraIdFieldProps {
  /** Display label — usually "Destination Tag", "Memo", or "Payment ID"
   *  depending on the chain. Comes from `Currency.externalIdName`. */
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Per-chain regex from the catalog. Same on-blur check as RecipientField. */
  extraIdRegex: string | null;
  required?: boolean;
}

/**
 * Memo / destination-tag field. Renders only when the active TO currency's
 * `hasExternalId` is set. The chains that need one (XRP, TON-USDT, Cosmos
 * family, Monero) reject deposits without it on the upstream side, so this
 * is functionally a "your money disappears if you skip" hint to the user.
 */
export function ExtraIdField({
  label,
  value,
  onChange,
  extraIdRegex,
  required = true,
}: ExtraIdFieldProps) {
  const inputId = useId();
  const [touched, setTouched] = useState(false);

  const error = (() => {
    if (!touched) return null;
    const trimmed = value.trim();
    if (!trimmed) return required ? `${label} required for this chain` : null;
    if (!extraIdRegex) return null;
    try {
      return new RegExp(extraIdRegex).test(trimmed) ? null : `Invalid ${label}`;
    } catch {
      return null;
    }
  })();

  return (
    <div className="ex-field" data-has-error={error ? '' : undefined}>
      <label className="ex-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="ex-field-input"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={`Enter ${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={!!error}
      />
      {error && <span className="ex-field-error">{error}</span>}
    </div>
  );
}
