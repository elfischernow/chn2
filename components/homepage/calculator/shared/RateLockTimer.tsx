'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** ISO timestamp from `estimate.validUntil`. Null when the upstream
   *  didn't return one (floating-rate flows, or quote that didn't bind a
   *  rateId) — the component renders nothing in that case. */
  validUntil: string | null;
}

/**
 * Pill-shaped lock + countdown shown on the rate row for Swap+Fixed and
 * Trade+Fixed. Reads `validUntil` from the estimate response and ticks
 * down once a second. The hook in `useExchangeEstimate` re-quotes every
 * 2 minutes (`REFRESH_MS`), comfortably ahead of the upstream's ~5-minute
 * `validUntil` window, so the displayed timer should reset on refresh
 * before it visibly hits 0:00.
 *
 * Intentionally NOT mounted on Private transfer (the Private flow's
 * single-field UI hides commitment messaging by design — the recipient-
 * gets line is the source of truth there) or fiat (provider strip stands
 * in for the rate row).
 */
export function RateLockTimer({ validUntil }: Props) {
  // We render text-content as the timer ticks; useState + an effect is
  // the right shape (vs reading `Date.now()` in render) because the
  // component must re-render once per second.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!validUntil) return;
    // 500ms cadence so the displayed second is always within ~half a
    // step of wall-clock — at 1s ticks the "1:00 → 0:59" transition can
    // lag by up to a full second depending on phase.
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [validUntil]);

  if (!validUntil) return null;
  const target = Date.parse(validUntil);
  if (!Number.isFinite(target)) return null;
  const remaining = Math.max(0, target - now);
  const totalSec = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  // Tint switches from green → amber when under 30s left, signalling the
  // upcoming auto-refresh. The hook reschedules well before this point in
  // the happy path; the amber state is mostly defensive — appears if the
  // tab was throttled in the background.
  const lowTime = totalSec <= 30;

  return (
    <span
      className={`swap-rate-timer${lowTime ? ' swap-rate-timer-low' : ''}`}
      title={lowTime ? 'Refreshing rate soon' : 'Rate locked'}
      aria-label={`Rate locked, ${m}:${String(s).padStart(2, '0')} remaining`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span className="swap-rate-timer-time">
        {m}:{String(s).padStart(2, '0')}
      </span>
    </span>
  );
}
