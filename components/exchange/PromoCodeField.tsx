'use client';

import { useState } from 'react';

const PROMO_CODE_FORMAT = /^[A-Z0-9]{12}$/;

interface PromoCodeFieldProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Promo-code disclosure — collapsed trigger reads as a styled text link
 * (no border, no fill) with the brand's blue→green gradient applied to
 * both the tag icon and the label. Sits at the left of the
 * `.ex-extras-row` next to the gray refund link on the right. Expanded
 * state renders a single-line input with the same gradient icon + paste
 * button.
 *
 * Validation is local-format-only (`^[A-Z0-9]{12}$`, matches legacy
 * `isPromoCodeValid`); the upstream is the source of truth on whether
 * the code is actually valid / unexpired / has uses left, and
 * `createTransaction` forwards the value at submit time.
 */
export function PromoCodeField({ value, onChange }: PromoCodeFieldProps) {
  // Auto-open when the field already has a value — restoring from
  // session-storage or a deep-link shouldn't hide the input.
  const [open, setOpen] = useState(value.length > 0);
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const formatInvalid =
    touched && trimmed.length > 0 && !PROMO_CODE_FORMAT.test(trimmed);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim().toUpperCase());
    } catch {
      /* permission denied — keyboard paste still works */
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="ex-promo-trigger"
        onClick={() => setOpen(true)}
      >
        <PromoTagIcon />
        <span className="ex-promo-trigger-text">I have a promo code</span>
      </button>
    );
  }

  return (
    <div
      className="ex-promo-inline"
      data-invalid={formatInvalid || undefined}
    >
      <PromoTagIcon />
      <input
        className="ex-promo-input"
        type="text"
        placeholder="Promo code"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={12}
        aria-label="Promo code"
        aria-invalid={formatInvalid || undefined}
      />
      <button
        type="button"
        className="ex-promo-paste"
        onClick={pasteFromClipboard}
      >
        Paste
      </button>
      {formatInvalid && (
        <span className="ex-promo-error" role="alert">
          Promo code is invalid
        </span>
      )}
    </div>
  );
}

/**
 * Tag icon — shape lifted from the legacy `new-stepper/purple-tag.svg`,
 * gradient stops retinted to the brand's blue → cyan → green ramp so it
 * matches the text gradient on the trigger. Inline-rendered so the icon
 * ships with the bundle (no extra request) and the gradient id is
 * randomised per call so multiple instances on the page don't share a
 * `<linearGradient>` definition.
 */
let promoIconIdSeq = 0;
function PromoTagIcon() {
  const id = `promo-tag-grad-${++promoIconIdSeq}`;
  return (
    <svg
      className="ex-promo-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.60156 1.6C2.49699 1.6 1.60156 2.49543 1.60156 3.6V6.70294C1.60156 7.23337 1.81228 7.74208 2.18735 8.11716L8.18735 14.1172C8.9684 14.8982 10.2347 14.8982 11.0158 14.1172L14.1187 11.0142C14.8998 10.2332 14.8998 8.96684 14.1187 8.18579L8.11872 2.18578C7.74365 1.81071 7.23494 1.6 6.70451 1.6H3.60156ZM4.00156 4.8C4.44339 4.8 4.80156 4.44183 4.80156 4C4.80156 3.55817 4.44339 3.2 4.00156 3.2C3.55973 3.2 3.20156 3.55817 3.20156 4C3.20156 4.44183 3.55973 4.8 4.00156 4.8Z"
        fill={`url(#${id})`}
      />
      <defs>
        <linearGradient
          id={id}
          x1="0"
          y1="8"
          x2="16"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4EA1F5" />
          <stop offset="0.5" stopColor="#5BC0DE" />
          <stop offset="1" stopColor="#76EAB1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
