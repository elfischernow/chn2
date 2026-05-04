'use client';

import { useRef } from 'react';

import type { Currency } from '@/lib/api/currencies';

import { CurrencyPicker } from '../../../CurrencyPicker';
import { FeesPill } from '../../shared/FeesPill';
import type { FiatDir } from '../../shared/types';
import { amountSizeAttr, focusFieldInput } from '../../shared/utils';

interface BuySellViewProps {
  currencies: readonly Currency[];
  fiatDir: FiatDir;
  from: string;
  fromNetwork: string;
  fromAmount: string;
  to: string;
  toNetwork: string;
  toAmount: string;
  hasError: boolean;
  showSkeletonFrom: boolean;
  showSkeletonTo: boolean;
  /** Pre-resolved value to display in the TO field — usually the
   *  selected provider's quote. `null` falls back to `toAmount`. */
  fiatProviderTo: string | null;
  onSelectFrom: (c: Currency) => void;
  onSelectTo: (c: Currency) => void;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
}

/**
 * Buy/Sell mode field stack — FROM (fiatOnly when buy), TO (fiatOnly
 * when sell), and the FiatProviderStrip below the rate row. No flip
 * button: the buy↔sell toggle in the rate row owns that affordance,
 * and a flip would let the user place fiat on the crypto side and
 * vice-versa. No LockBadge either — fiat on-ramps quote a single
 * all-in price and don't expose a fixed-rate concept.
 */
export function BuySellView({
  currencies,
  fiatDir,
  from,
  fromNetwork,
  fromAmount,
  to,
  toNetwork,
  toAmount,
  hasError,
  showSkeletonFrom,
  showSkeletonTo,
  fiatProviderTo,
  onSelectFrom,
  onSelectTo,
  onFromAmountChange,
  onToAmountChange,
}: BuySellViewProps) {
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const toDisplayValue = fiatProviderTo ?? toAmount;

  return (
    <>
      <div className="swap-from-slot">
        <div
          className="swap-field"
          data-has-error={hasError || undefined}
          onClick={(e) => focusFieldInput(e, fromInputRef.current)}
        >
          <div className="swap-label">
            <span>{fiatDir === 'buy' ? 'You pay' : 'You sell'}</span>
            <span></span>
          </div>
          <CurrencyPicker
            currencies={currencies}
            selectedTicker={from}
            selectedNetwork={fromNetwork}
            ariaLabel={fiatDir === 'buy' ? 'Pay with' : 'Send currency'}
            fiatOnly={fiatDir === 'buy'}
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
      </div>

      <div
        className="swap-field"
        data-readonly
        onClick={(e) => focusFieldInput(e, toInputRef.current)}
      >
        <div className="swap-label">
          <span>You get</span>
          {/* Fiat on-ramps don't expose a separate withdrawal fee — the
              provider quotes one all-in price, so omit the network-fee
              row entirely. */}
          <FeesPill />
        </div>
        <CurrencyPicker
          currencies={currencies}
          selectedTicker={to}
          selectedNetwork={toNetwork}
          ariaLabel={fiatDir === 'sell' ? 'Cash out to' : 'Receive currency'}
          fiatOnly={fiatDir === 'sell'}
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
                readOnly
                aria-readonly
              />
              {showSkeletonTo && <span className="swap-skel-overlay" aria-hidden />}
            </div>
          }
        />
      </div>
    </>
  );
}
