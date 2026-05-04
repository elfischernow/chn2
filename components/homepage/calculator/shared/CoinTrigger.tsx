'use client';

import { Coin } from '../../Coin';

interface CoinTriggerProps {
  /** Uppercase ticker shown on the top line — e.g. `BTC`, `USDC`. */
  ticker: string;
  /** Source for the coin avatar. Falls back to the ticker bubble. */
  iconUrl?: string | null;
  /** Optional colored chain chip rendered on the second line — e.g. a
   *  `TRX` / `BASE` / `MATIC` pill in the chain's brand color. Mirrors the
   *  badge that appears on listbox rows so the closed and open states read
   *  in the same visual language. Pass `null` for single-network coins
   *  (BTC, ETH, …) where the chip would just be ticker noise. */
  chainBadge?: { code: string; bg: string; fg: string } | null;
  /** Picker open state — controls aria + swaps the contents to a close X. */
  open?: boolean;
  ariaLabel?: string;
  ariaControls?: string;
  onClick?: () => void;
}

/**
 * Closed-state trigger pill for the currency picker. A pure presentational
 * lego brick — no business logic, no filtering, no popover. The picker
 * (`CurrencyPicker`) wraps it with the dropdown and event wiring.
 *
 * The visual matches the reference design supplied in chat: rounded-rect
 * (not pill) container, two-line label, network dot on the avatar, vertical
 * divider before the chevron. The same DOM node is the close affordance
 * when `open` is true so the click target stays put through the open/close
 * transition.
 */
export function CoinTrigger({
  ticker,
  iconUrl = null,
  chainBadge = null,
  open = false,
  ariaLabel,
  ariaControls,
  onClick,
}: CoinTriggerProps) {
  return (
    <button
      type="button"
      className="coin-trigger"
      data-open={open || undefined}
      aria-label={open ? 'Close currency picker' : ariaLabel ?? 'Select currency'}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? ariaControls : undefined}
      onClick={onClick}
    >
      {open ? (
        <svg
          className="coin-trigger-close"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      ) : (
        <>
          <span className="coin-trigger-avatar">
            <Coin symbol={ticker} iconUrl={iconUrl} />
          </span>
          <span className="coin-trigger-text">
            <span className="coin-trigger-ticker">{ticker}</span>
            {chainBadge && (
              <span
                className="coin-trigger-chip"
                style={{ background: chainBadge.bg, color: chainBadge.fg }}
              >
                {chainBadge.code}
              </span>
            )}
          </span>
          <svg
            className="coin-trigger-caret"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </>
      )}
    </button>
  );
}
