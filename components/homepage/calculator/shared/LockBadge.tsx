'use client';

/**
 * Pill-shaped fixed-rate indicator. Sits inside the amount-input slot,
 * left of the currency selector, when the active rate flow is fixed
 * (Swap+Fixed or Convert+Fixed). Brighter green tint than the legacy
 * in-pill lock — meant to be spotted at a glance, not blend with the
 * chrome.
 */
export function LockBadge() {
  return (
    <span className="swap-lock-pill" title="Fixed rate" aria-label="Fixed rate">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    </span>
  );
}
