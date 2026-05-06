'use client';

import { useId, useState } from 'react';

interface RecipientFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  /** Per-chain regex (string from upstream catalog). The check fires
   *  on blur — typing while invalid doesn't surface an error so the
   *  user can complete a paste before getting yelled at. */
  addressRegex: string | null;
  /** Surfaces upstream / submit-time validation errors. Wins over the
   *  local regex result. */
  externalError?: string | null;
  required?: boolean;
  ariaDescribedBy?: string;
}

/**
 * Recipient-wallet input. Keeps the legacy SetTransactionStep's UX
 * lightweight: label + input + on-blur format check. The "scan QR" /
 * "use saved wallet" affordances from the legacy flow are deliberately
 * out — the current scope is the form, not the address-acquisition UX.
 */
export function RecipientField({
  label,
  placeholder,
  value,
  onChange,
  addressRegex,
  externalError,
  required = true,
  ariaDescribedBy,
}: RecipientFieldProps) {
  const inputId = useId();
  const [touched, setTouched] = useState(false);

  const localError = (() => {
    if (!touched) return null;
    if (!value.trim()) return required ? 'Recipient address required' : null;
    if (!addressRegex) return null;
    try {
      return new RegExp(addressRegex).test(value.trim())
        ? null
        : 'Invalid wallet address for this network';
    } catch {
      return null;
    }
  })();

  const error = externalError ?? localError;

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
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy}
      />
      {error && <span className="ex-field-error">{error}</span>}
    </div>
  );
}
