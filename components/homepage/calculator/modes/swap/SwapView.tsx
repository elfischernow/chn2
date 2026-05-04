'use client';

import { useRef } from 'react';

import type { Currency } from '@/lib/api/currencies';

import { CurrencyPicker } from '../../../CurrencyPicker';
import { FeesPill } from '../../shared/FeesPill';
import { LockBadge } from '../../shared/LockBadge';
import { amountSizeAttr, focusFieldInput } from '../../shared/utils';

interface SwapViewProps {
  currencies: readonly Currency[];
  from: string;
  fromNetwork: string;
  fromAmount: string;
  to: string;
  toNetwork: string;
  toAmount: string;
  /** Tints the FROM field red when the upstream surfaced an error or
   *  marked the amount as out of range. */
  hasError: boolean;
  showSkeletonFrom: boolean;
  showSkeletonTo: boolean;
  /** True when the active rate flow is fixed — toggles the LockBadge on
   *  the TO field. */
  isFixedFlow: boolean;
  /** Withdrawal fee for the fees-pill tooltip. `null` while the estimate
   *  is in flight. */
  withdrawalFee: number | null;
  onSelectFrom: (c: Currency) => void;
  onSelectTo: (c: Currency) => void;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  onFlip: () => void;
}

/**
 * Swap-mode field stack — FROM, flip, TO. Standard crypto-to-crypto
 * exchange shape. The rate-row toggle (Floating/Fixed), the CTA, and
 * the Pro upsell strip are owned by the orchestrator (`SwapWidget`);
 * this view is the lego composition for the field stack itself.
 */
export function SwapView({
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
  withdrawalFee,
  onSelectFrom,
  onSelectTo,
  onFromAmountChange,
  onToAmountChange,
  onFlip,
}: SwapViewProps) {
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="swap-from-slot">
        <div
          className="swap-field"
          data-has-error={hasError || undefined}
          onClick={(e) => focusFieldInput(e, fromInputRef.current)}
        >
          <div className="swap-label">
            <span>You send</span>
            <span></span>
          </div>
          <CurrencyPicker
            currencies={currencies}
            selectedTicker={from}
            selectedNetwork={fromNetwork}
            // No `excludeTicker`: same-ticker pairs (e.g. USDT-TRX → USDT-ETH
            // for cross-network swaps) are legitimate flows. The estimator
            // surfaces "no rate" through `error` if the upstream actually
            // refuses to quote, which is the right place to fail loud
            // rather than hiding the option from the picker entirely.
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
          <span>You get</span>
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
                data-size={amountSizeAttr(toAmount)}
                value={toAmount}
                onChange={(e) => onToAmountChange(e.target.value)}
                inputMode="decimal"
                placeholder={showSkeletonTo ? '' : '—'}
              />
              {showSkeletonTo && <span className="swap-skel-overlay" aria-hidden />}
              {isFixedFlow && <LockBadge />}
            </div>
          }
        />
      </div>
    </>
  );
}
