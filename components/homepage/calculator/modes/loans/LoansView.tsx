'use client';

import { useRef } from 'react';

import { useI18n } from '@/lib/i18n/client';
import type { LoanCurrency, LoanEstimateResponse } from '@/lib/api/coin-rabbit';

import { amountSizeAttr, DECIMAL_RE, focusFieldInput } from '../../shared/utils';
import { LoanCurrencyPicker } from './LoanCurrencyPicker';
import { LoanTermsBlock } from './LoanTermsBlock';

interface LoansViewProps {
  /** Deposit-side list (collateral). */
  depositList: readonly LoanCurrency[];
  /** Loan-side list. */
  loanList: readonly LoanCurrency[];
  /** Selected collateral ticker (lowercase). */
  from: string;
  fromNetwork: string;
  /** FROM amount as user-typed (string, controlled). */
  fromAmount: string;
  /** Selected loan ticker (lowercase). */
  to: string;
  toNetwork: string;
  toAmount: string;
  /** Resolved deposit currency (from `depositList`). May be null while
   *  the lists are loading. */
  fromCurrency: LoanCurrency | null;
  /** Resolved loan currency. */
  toCurrency: LoanCurrency | null;
  /** Tints the FROM field red when the estimate surfaced an error. */
  hasError: boolean;
  /** Skeleton overlays mirror the Swap/Trade conventions. */
  showSkeletonFrom: boolean;
  showSkeletonTo: boolean;
  /** Active estimate response — drives the terms block. */
  estimate: LoanEstimateResponse | null;
  /** True while currency lists are still loading. */
  isCurrenciesLoading: boolean;
  onSelectFrom: (c: LoanCurrency) => void;
  onSelectTo: (c: LoanCurrency) => void;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
}

/**
 * Loans-mode field stack. Mirrors `SwapView`'s shape — FROM field, an
 * inline `LoanTermsBlock` between the fields, TO field — minus the flip
 * button. The flip is intentionally omitted: collateral and loan
 * directions aren't symmetric (you don't "swap" a collateral position
 * for a loan position with one click), and the user picks both sides
 * directly via the pickers anyway.
 *
 * No `is_stable` filtering of either list — the user freely picks any
 * combination (USDT collateral / BTC loan, or BTC collateral / USDT
 * loan, or anything else). The legacy Bull/Bear tab split is retired.
 */
export function LoansView({
  depositList,
  loanList,
  from,
  fromNetwork,
  fromAmount,
  to,
  toNetwork,
  toAmount,
  fromCurrency,
  toCurrency,
  hasError,
  showSkeletonFrom,
  showSkeletonTo,
  estimate,
  isCurrenciesLoading,
  onSelectFrom,
  onSelectTo,
  onFromAmountChange,
  onToAmountChange,
}: LoansViewProps) {
  const t = useI18n();
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const onFromInput = (value: string) => {
    if (value !== '' && !DECIMAL_RE.test(value)) return;
    onFromAmountChange(value);
  };
  const onToInput = (value: string) => {
    if (value !== '' && !DECIMAL_RE.test(value)) return;
    onToAmountChange(value);
  };

  return (
    <>
      <div
        className="swap-field"
        data-has-error={hasError || undefined}
        onClick={(e) => focusFieldInput(e, fromInputRef.current)}
      >
        <div className="swap-label">
          <span>{t('LOANS.CALCULATOR.COLLATERAL_REQUIRED') || 'Collateral Required'}</span>
          <span></span>
        </div>
        <LoanCurrencyPicker
          items={depositList}
          selectedTicker={from}
          selectedNetwork={fromNetwork}
          ariaLabel="Collateral currency"
          onSelect={onSelectFrom}
          amountSlot={
            <div className="swap-input-wrap">
              <input
                ref={fromInputRef}
                className="swap-amount"
                data-size={amountSizeAttr(fromAmount)}
                value={fromAmount}
                onChange={(e) => onFromInput(e.target.value)}
                inputMode="decimal"
                disabled={isCurrenciesLoading}
              />
              {showSkeletonFrom && <span className="swap-skel-overlay" aria-hidden />}
            </div>
          }
        />
      </div>

      <LoanTermsBlock estimate={estimate} from={fromCurrency} to={toCurrency} />

      <div
        className="swap-field"
        onClick={(e) => focusFieldInput(e, toInputRef.current)}
      >
        <div className="swap-label">
          <span>{t('LOANS.CALCULATOR.LOAN_AMOUNT') || 'Loan Amount'}</span>
          <span></span>
        </div>
        <LoanCurrencyPicker
          items={loanList}
          selectedTicker={to}
          selectedNetwork={toNetwork}
          ariaLabel="Loan currency"
          onSelect={onSelectTo}
          amountSlot={
            <div className="swap-input-wrap">
              <input
                ref={toInputRef}
                className="swap-amount"
                data-size={amountSizeAttr(toAmount)}
                value={toAmount}
                onChange={(e) => onToInput(e.target.value)}
                inputMode="decimal"
                placeholder={showSkeletonTo ? '' : '—'}
                disabled={isCurrenciesLoading}
              />
              {showSkeletonTo && <span className="swap-skel-overlay" aria-hidden />}
            </div>
          }
        />
      </div>
    </>
  );
}
