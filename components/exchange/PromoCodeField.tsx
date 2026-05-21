'use client';

import { useId, useState } from 'react';

import {
  type PromoCodeValidation,
  isPromoCodeFormatValid,
} from '@/lib/api/promo-code';

interface PromoCodeFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Upstream validation state for the current code. `null` when no
   *  validation is in-flight (e.g. format invalid, code cleared). */
  validation: PromoCodeValidation | null;
  isValidating: boolean;
}

/**
 * Promo-code disclosure — collapsed trigger reads as a styled text link
 * (no border, no fill) with the brand's blue→green gradient applied to
 * both the tag icon and the label. Sits at the left of the
 * `.ex-extras-row` next to the gray refund link on the right. Expanded
 * state renders a single-line input with the same gradient icon + paste
 * button.
 *
 * Validation happens in two stages, mirroring legacy
 * `new-stepper-promo-code.tsx`:
 *   1. Local format check (`^[A-Z0-9]{12}$`) — fires immediately on blur.
 *   2. Upstream `/promo-codes/{hash}` lookup — surfaces the loader while
 *      in flight, a check on success, and a contextual warning on
 *      expiry / no uses left / unknown code.
 *
 * The upstream is the source of truth on whether the code is actually
 * valid / unexpired / has uses left; `createTransaction` forwards the
 * value at submit time regardless (the API rejects an invalid code so we
 * never silently keep a bogus promo around).
 */
export function PromoCodeField({
  value,
  onChange,
  validation,
  isValidating,
}: PromoCodeFieldProps) {
  // Auto-open when the field already has a value — restoring from
  // session-storage or a deep-link shouldn't hide the input.
  const [open, setOpen] = useState(value.length > 0);
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const formatInvalid =
    touched && trimmed.length > 0 && !isPromoCodeFormatValid(trimmed);

  const isFetching = !!trimmed && isPromoCodeFormatValid(trimmed) && isValidating;
  const upstreamValid =
    validation != null &&
    validation.isValid &&
    !validation.isExpired &&
    validation.usesLeft !== 0;

  // Warning copy — first match wins. Mirrors legacy `warningText` chain.
  const upstreamWarning = (() => {
    if (!trimmed || !isPromoCodeFormatValid(trimmed)) return null;
    if (!validation || isValidating) return null;
    if (validation.error) return 'Promo code is invalid';
    if (validation.isExpired) return 'Promo code has expired';
    if (validation.usesLeft === 0) return 'Promo code has no uses left';
    if (!validation.isValid) return 'Promo code is invalid';
    return null;
  })();

  const showError = formatInvalid || (!!upstreamWarning && touched);
  const errorText = formatInvalid ? 'Promo code is invalid' : upstreamWarning;

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
      data-invalid={showError || undefined}
      data-valid={upstreamValid || undefined}
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
        aria-invalid={showError || undefined}
      />
      <span className="ex-promo-status" aria-hidden>
        {isFetching ? (
          <PromoSpinner />
        ) : upstreamValid ? (
          <PromoCheckIcon />
        ) : null}
      </span>
      {!upstreamValid && (
        <button
          type="button"
          className="ex-promo-paste"
          onClick={pasteFromClipboard}
        >
          Paste
        </button>
      )}
      {/* No "X% Promo applied" badge under the field — the discount size
          renders on the TO-field's `.fees-pill` (in place of "Fees included"),
          and the strikethrough non-promo amount sits in the receive box.
          Duplicating it here would be the "in addition" treatment the legacy
          /exchange explicitly avoids. */}
      {showError && errorText && (
        <span className="ex-promo-error" role="alert">
          {errorText}
        </span>
      )}
    </div>
  );
}

/**
 * Tag icon — shape lifted from the legacy `new-stepper/purple-tag.svg`,
 * gradient stops retinted to the brand's blue → cyan → green ramp so it
 * matches the text gradient on the trigger. Inline-rendered so the icon
 * ships with the bundle (no extra request).
 *
 * The gradient `<defs id>` needs to be unique per instance (otherwise a
 * second icon on the page would re-use the first's `<linearGradient>`
 * and any later style change would bleed between them). We use
 * `React.useId()` — the previous module-level counter was a hydration
 * mismatch in waiting: SSR and the client increment it on different
 * schedules (the SSR pass renders every instance once before the client
 * mounts; the client then re-renders during hydration), so the server
 * shipped `promo-tag-grad-8` while the client produced `promo-tag-grad-2`
 * and React rejected the hydration.
 */
function PromoTagIcon() {
  const id = `promo-tag-grad-${useId()}`;
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

function PromoSpinner() {
  return (
    <svg
      className="ex-promo-spinner"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="22 18"
      />
    </svg>
  );
}

function PromoCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 8.5l3 3 6-6"
        stroke="#00c26f"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
