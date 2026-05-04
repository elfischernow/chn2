'use client';

import { DECIMAL_RE } from '../../../shared/utils';

import { formatLimitPrice, limAmountSize, parseStrictNumber } from './limit-math';
import type { LimitState } from './useLimitState';

interface LimitPriceFieldProps extends LimitState {
  marketRate: number | null;
  /** Active FROM ticker — used in the field label + aria text. */
  from: string;
  /** Active TO ticker — same use as `from`, on the inverse side. */
  to: string;
}

/**
 * Convert + limit sub-mode price field. Renders the user-editable limit
 * price (with prefix and inline ticker), a reverse-direction toggle, an
 * inline delta-from-market badge (or a "below market · reset" pill when
 * the price would land worse than market), and the +1/+5/+10% buttons.
 *
 * State + derivations live in `useLimitState` so the parent can read
 * the current `directNum` to compute the implied "You buy" amount in
 * the receive field above. This component receives that state as props
 * and only handles presentation + local input handlers.
 */
export function LimitPriceField({
  marketRate,
  from,
  to,
  isInverse,
  setIsInverse,
  limitRaw,
  setLimitRaw,
  resetToMarket,
  seedDisplay,
  displayNum,
  displayMarket,
  directNum,
}: LimitPriceFieldProps) {
  // While the user is actively editing, the input must echo their
  // exact keystrokes — re-formatting per render would clobber the
  // cursor and trim fractional digits. Once they reset (raw === null)
  // we fall back to the formatted seed so the field reads as a
  // fillable anchor instead of an empty box.
  const displayPx =
    limitRaw != null
      ? limitRaw
      : seedDisplay != null
        ? formatLimitPrice(seedDisplay)
        : '';

  // Delta is computed in display-space so it tracks the input the
  // user is reading. Direct mode: positive = sell premium (green).
  // Inverse mode: positive would mean "paying more than market"
  // (red) — so the sign naturally flips when isInverse, matching
  // the user's mental model.
  const deltaPct =
    displayNum != null && displayMarket != null && displayMarket > 0
      ? ((displayNum - displayMarket) / displayMarket) * 100
      : null;

  // Below-market guard. The check is *always* on directPrice ≥
  // marketRate — semantically "the user's quote is at least as
  // favorable as market". Holds in both display orientations
  // because flipping the display preserves the inequality.
  const isBelowMarket =
    marketRate != null && directNum != null && directNum < marketRate;

  // Label/prefix/ticker — flip with `isInverse`. Direct reads
  // "Sell price for 1 BTC ≥ X ETH"; inverse reads "Buy price for
  // 1 ETH ≤ X BTC".
  const priceLabel = isInverse ? `Buy price for 1 ${to}` : `Sell price for 1 ${from}`;
  const priceTicker = isInverse ? from : to;
  const pricePrefix = isInverse ? '≤' : '≥';

  // % buttons operate in *display* space so the visible delta
  // matches the label exactly. Direct mode +5% → display = market
  // × 1.05 (delta +5%). Inverse mode −5% → display = (1/market) ×
  // 0.95 (delta −5% exactly, not −4.76% as the prior reciprocal-
  // first math produced).
  const onPctClick = (p: number) => {
    if (marketRate == null || marketRate <= 0 || displayMarket == null) return;
    const sign = isInverse ? -1 : 1;
    const target = displayMarket * (1 + (sign * p) / 100);
    if (!Number.isFinite(target) || target <= 0) return;
    setLimitRaw(formatLimitPrice(target));
  };

  // Reverse button — flips display orientation. If the user has
  // typed a value, convert it via 1/x so the same economic price
  // stays on screen, just expressed in the other direction.
  const onReverse = () => {
    const parsed = limitRaw != null ? parseStrictNumber(limitRaw) : null;
    if (parsed != null) {
      setLimitRaw(formatLimitPrice(1 / parsed));
    }
    setIsInverse(!isInverse);
  };

  // Store the raw text exactly as typed; downstream derivations
  // re-parse it on demand. Reject obvious garbage (commas, spaces,
  // scientific notation, multi-dot input) at the input boundary
  // rather than silently letting `parseFloat` truncate it.
  const onLimitDirectInput = (raw: string) => {
    if (raw !== '' && !DECIMAL_RE.test(raw)) return;
    // Sanity cap — past 24 chars the user is pasting nonsense and
    // we'd be heading toward perf tarpits on every keystroke parse.
    if (raw.length > 24) return;
    setLimitRaw(raw);
  };

  return (
    <div className="swap-field lim-field" data-has-error={isBelowMarket || undefined}>
      <div className="swap-label lim-label">
        <span>{priceLabel}</span>
        <button
          type="button"
          className="lim-reverse"
          onClick={onReverse}
          aria-label="Reverse price direction"
          aria-pressed={isInverse}
          title="Reverse price direction"
        >
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
            <path d="M7 4v14" />
            <path d="m3 8 4-4 4 4" />
            <path d="M17 20V6" />
            <path d="m21 16-4 4-4-4" />
          </svg>
        </button>
      </div>
      <div className="swap-row">
        <div className="lim-px-stack">
          <div className="lim-px-row">
            <span className="lim-prefix">{pricePrefix}</span>
            <input
              className="swap-amount lim-amount"
              value={displayPx}
              onChange={(e) => onLimitDirectInput(e.target.value)}
              inputMode="decimal"
              // `size` keeps the input width tracking content length
              // (cross-browser equivalent of `field-sizing: content`).
              // We *also* step the font down via `data-size` for long
              // values — without that the input would keep widening
              // until it pushes the inline ticker and pct-buttons
              // off-row. Same shrink-on-overflow pattern the main
              // amount fields use, just with smaller breakpoints
              // since the limit price renders at 22px not 32px.
              size={Math.max(displayPx.length, 1)}
              data-size={limAmountSize(displayPx)}
              aria-label={`Limit price in ${priceTicker} per 1 ${isInverse ? to : from}`}
            />
            <span className="lim-tk-inline">{priceTicker}</span>
          </div>
          {isBelowMarket ? (
            // Below-market hint — keep it inline (same row as the
            // delta) so the field's height is stable. Click the
            // pill to snap back to the market-anchored seed.
            <button
              type="button"
              className="lim-reset"
              onMouseDown={(e) => {
                // mouseDown so the click fires before blur eats the
                // focus state when the user clicks straight from the
                // input.
                e.preventDefault();
                resetToMarket();
              }}
            >
              {isInverse ? 'Above market' : 'Below market'} · reset
            </button>
          ) : (
            deltaPct != null && (() => {
              // In inverse mode the user is the BUYER — paying *less*
              // than market is the favorable direction, so a negative
              // raw delta is "in your favor" and should read green.
              // Flipping the sign in display keeps the convention
              // uniform: positive % = premium for the user, green;
              // negative % = paying away from the user, red. The
              // raw arithmetic delta from market is preserved up to
              // sign — only its visual framing flips.
              const favorPct = isInverse ? -deltaPct : deltaPct;
              return (
                <span className={`lim-delta ${favorPct >= 0 ? 'lim-pos' : 'lim-neg'}`}>
                  {favorPct >= 0 ? '+' : ''}
                  {favorPct.toFixed(1)}% from market
                </span>
              );
            })()
          )}
        </div>
        <div className="pct-buttons">
          {[1, 5, 10].map((p) => (
            <button
              key={p}
              type="button"
              className="pct-btn"
              onClick={() => onPctClick(p)}
              disabled={marketRate == null}
            >
              {/* Sign flips with isInverse so the label matches
                  the displayed delta — clicking "−5%" in inverse
                  mode lowers the displayed buy price by ~4.76%
                  (which is "+5% directPrice premium" internally,
                  favorable to the user either way). */}
              {isInverse ? '−' : '+'}{p}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
