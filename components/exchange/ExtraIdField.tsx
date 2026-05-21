'use client';

import { useMemo } from 'react';

const compileRegex = (raw: string | null | undefined): RegExp | null => {
  if (!raw) return null;
  try {
    return new RegExp(raw);
  } catch {
    return null;
  }
};

interface ExtraIdFieldProps {
  /** Chain-specific name surfaced in the floating label and error copy
   *  — "Memo", "Destination Tag", "Payment ID". Defaults to "Memo".
   *  Comes from `Currency.externalIdName`. */
  fieldName?: string;
  /** Validator from the upstream catalog. */
  extraIdRegex?: string | null;
  value: string;
  onChange: (next: string) => void;
  /** External (submit-time) error — wins over the local regex check. */
  externalError?: string | null;
}

/**
 * Optional memo / destination-tag / payment-id input. Shares the
 * `pt-address-*` shell and floating-label UX with `WalletAddressField`
 * so the two fields read as a set. Only the "Paste" affordance is
 * surfaced — wallet-connect and QR scan don't apply to a memo string.
 *
 * Renders only when the active TO currency's `hasExternalId` is set.
 * The chains that need one (XRP, TON-USDT, Cosmos family, Monero) reject
 * deposits without it on the upstream side.
 */
export function ExtraIdField({
  fieldName,
  extraIdRegex,
  value,
  onChange,
  externalError,
}: ExtraIdFieldProps) {
  const validator = useMemo(() => compileRegex(extraIdRegex), [extraIdRegex]);
  const localInvalid =
    validator != null && value.length > 0 && !validator.test(value.trim());
  const isInvalid = !!externalError || localInvalid;

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      /* permission denied or no gesture — keyboard paste still works */
    }
  };

  const name = fieldName ?? 'Memo';
  const errorText = externalError
    ?? (localInvalid
      ? `${name} format doesn't match what this chain expects.`
      : null);

  return (
    <div className="pt-address-field" data-invalid={isInvalid || undefined}>
      <label className="pt-address-input-wrap">
        <input
          className="pt-address-input"
          type="text"
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          aria-label={`Recipient ${name}`}
          aria-invalid={isInvalid || undefined}
        />
        <span className="pt-address-floating-label">
          Enter the {name} (optional)
        </span>
      </label>
      <div className="pt-address-actions">
        <button
          type="button"
          className="pt-address-paste"
          onClick={pasteFromClipboard}
        >
          Paste
        </button>
      </div>
      {errorText && (
        <span className="pt-address-error" role="alert">
          {errorText}
        </span>
      )}
    </div>
  );
}
