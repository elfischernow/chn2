'use client';

import { useRef } from 'react';

import type { Currency } from '@/lib/api/currencies';

import { CurrencyPicker } from '../../../CurrencyPicker';
import { FeesPill } from '../../shared/FeesPill';
import { LockBadge } from '../../shared/LockBadge';
import { amountSizeAttr, focusFieldInput } from '../../shared/utils';

import { LimitPriceField } from './LimitPriceField';
import type { LimitState } from './LimitPriceField/useLimitState';

interface ConvertViewProps {
  currencies: readonly Currency[];
  from: string;
  fromNetwork: string;
  fromAmount: string;
  to: string;
  toNetwork: string;
  toAmount: string;
  hasError: boolean;
  showSkeletonFrom: boolean;
  showSkeletonTo: boolean;
  /** True when the active rate flow is fixed (Convert + Fixed sub-mode).
   *  Toggles the LockBadge on the TO field. */
  isFixedFlow: boolean;
  /** True when sub-mode is `limit` — freezes the TO field, swaps in the
   *  user's implied amount, and unlocks the LimitPriceField below. */
  isLimit: boolean;
  /** Pre-formatted "implied TO at the user's limit price". Replaces the
   *  upstream estimate's value in the TO field while in limit mode so the
   *  receive amount tracks the order the user is actually placing. `null`
   *  → fall back to the live `toAmount`. */
  limitImpliedTo: string | null;
  /** Withdrawal fee for the fees-pill tooltip. */
  withdrawalFee: number | null;
  /** Live market rate (TO per 1 FROM) — passed straight to the
   *  LimitPriceField. */
  marketRate: number | null;
  /** Limit-state slice from `useLimitState`. */
  limit: LimitState;
  onSelectFrom: (c: Currency) => void;
  onSelectTo: (c: Currency) => void;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  onFlip: () => void;
}

/**
 * Convert-mode field stack — FROM, flip, TO, plus the LimitPriceField
 * when the sub-mode is `limit`. The Pro spot/limit/market flow lives
 * here; the parent orchestrator owns the Market/Fixed/Limit toggle in
 * the rate row and the "Place limit order" / "Continue" CTA.
 */
export function ConvertView({
  currencies,
  from,
  fromNetwork,
  fromAmount,
  to,
  toNetwork,
  toAmount,
  hasError,
  showSkeletonFrom,
  showSkeletonTo,
  isFixedFlow,
  isLimit,
  limitImpliedTo,
  withdrawalFee,
  marketRate,
  limit,
  onSelectFrom,
  onSelectTo,
  onFromAmountChange,
  onToAmountChange,
  onFlip,
}: ConvertViewProps) {
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const toDisplayValue = (isLimit ? limitImpliedTo : null) ?? toAmount;

  return (
    <>
      <div className="swap-from-slot">
        <div
          className="swap-field"
          data-has-error={hasError || undefined}
          onClick={(e) => focusFieldInput(e, fromInputRef.current)}
        >
          <div className="swap-label">
            <span>You sell</span>
            <span></span>
          </div>
          <CurrencyPicker
            currencies={currencies}
            selectedTicker={from}
            selectedNetwork={fromNetwork}
            ariaLabel="Send currency"
            onSelect={onSelectFrom}
            amountSlot={
              <div className="swap-input-wrap">
                <input
                  ref={fromInputRef}
                  className="swap-amount"
                  data-size={amountSizeAttr(fromAmount)}
                  value={fromAmount}
                  onChange={(e) => onFromAmountChange(e.target.value)}
                  inputMode="decimal"
                />
                {showSkeletonFrom && <span className="swap-skel-overlay" aria-hidden />}
              </div>
            }
          />
        </div>

        <button className="swap-flip" onClick={onFlip} aria-label="Flip">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 4v14" />
            <path d="m3 8 4-4 4 4" />
            <path d="M17 20V6" />
            <path d="m21 16-4 4-4-4" />
          </svg>
        </button>
      </div>

      <div
        className="swap-field"
        onClick={(e) => focusFieldInput(e, toInputRef.current)}
      >
        <div className="swap-label">
          <span>You buy</span>
          <FeesPill networkFee={{ amount: withdrawalFee, ticker: to }} />
        </div>
        <CurrencyPicker
          currencies={currencies}
          selectedTicker={to}
          selectedNetwork={toNetwork}
          ariaLabel="Receive currency"
          onSelect={onSelectTo}
          amountSlot={
            <div className="swap-input-wrap">
              <input
                ref={toInputRef}
                className="swap-amount"
                data-size={amountSizeAttr(toDisplayValue)}
                value={toDisplayValue}
                onChange={(e) => onToAmountChange(e.target.value)}
                inputMode="decimal"
                placeholder={showSkeletonTo ? '' : '—'}
                // In limit mode the price field is the canonical lever —
                // typing in "You buy" would conflict with it, so freeze
                // the input.
                readOnly={isLimit}
                aria-readonly={isLimit}
              />
              {showSkeletonTo && <span className="swap-skel-overlay" aria-hidden />}
              {isFixedFlow && <LockBadge />}
            </div>
          }
        />
      </div>

      {isLimit && (
        <LimitPriceField marketRate={marketRate} from={from} to={to} {...limit} />
      )}
    </>
  );
}
