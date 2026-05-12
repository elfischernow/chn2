'use client';

import { useI18n } from '@/lib/i18n/client';
import type { LoanCurrency, LoanEstimateResponse } from '@/lib/api/coin-rabbit';

interface LoanTermsBlockProps {
  estimate: LoanEstimateResponse | null;
  /** Deposit-side currency (collateral) — used to format the liquidation
   *  price's quote ticker. */
  from: LoanCurrency | null;
  /** Loan-side currency — used for the annual-interest amount ticker and
   *  the liquidation price's base ticker. */
  to: LoanCurrency | null;
}

/**
 * Inline 3-row terms strip between the deposit and loan fields. Visual
 * footprint matches the existing `ex-rate-row` / `FeesPill` plates so it
 * reads as part of the same chrome rather than a separate widget.
 *
 * Rows: Loan term (always "Unlimited ∞") · Annual interest rate (in the
 * loan currency) · Liquidation price (FROM-vs-TO rate at which collateral
 * auto-sells). Each row carries a CSS hover tooltip — same pattern the
 * `FeesPill` uses, so the tooltip styling carries over without a new
 * component.
 */
export function LoanTermsBlock({ estimate, from, to }: LoanTermsBlockProps) {
  const t = useI18n();

  const annualInterest = (() => {
    const raw = estimate?.interestAmounts?.year;
    if (raw == null) return '—';
    const ticker = to?.currentTicker.toUpperCase();
    return ticker ? `${raw} ${ticker}` : raw;
  })();

  const liquidationPrice = (() => {
    const raw = estimate?.downLimit;
    if (!raw) return '—';
    const base = from?.currentTicker.toUpperCase();
    const quote = to?.currentTicker.toUpperCase();
    if (!base || !quote) return raw;
    return `${raw} ${base}/${quote}`;
  })();

  return (
    <div className="loan-terms">
      <div className="loan-terms-row" tabIndex={0}>
        <span className="loan-terms-label">
          {t('LOANS.CALCULATOR.LOAN_TERM') || 'Loan term'}
        </span>
        <span className="loan-terms-value">
          {t('LOANS.CALCULATOR.UNLIMITED') || 'Unlimited'}
          <span className="loan-terms-infinity" aria-hidden>∞</span>
        </span>
        <span className="loan-terms-tip" role="tooltip">
          {t('LOANS.CALCULATOR.LOAN_TERM_TOOLTIP') ||
            'The loan term depends only on your wish to buy your collateral back and close this loan or on reaching the liquidation'}
        </span>
      </div>
      <div className="loan-terms-row" tabIndex={0}>
        <span className="loan-terms-label">
          {t('LOANS.CALCULATOR.ANNUAL_INTEREST_RATE') || 'Annual interest rate'}
        </span>
        <span className="loan-terms-value">{annualInterest}</span>
        <span className="loan-terms-tip" role="tooltip">
          {t('LOANS.CALCULATOR.ANNUAL_INTEREST_RATE_TOOLTIP') ||
            'Interest rate is accrued every month from the moment of getting the loan and is paid at the moment of closing the loan.'}
        </span>
      </div>
      <div className="loan-terms-row" tabIndex={0}>
        <span className="loan-terms-label">
          {t('LOANS.CALCULATOR.PRICE_DOWN_LIMIT') || 'Price down limit'}
        </span>
        <span className="loan-terms-value">{liquidationPrice}</span>
        <span className="loan-terms-tip" role="tooltip">
          {t('LOANS.CALCULATOR.PRICE_DOWN_LIMIT_TOOLTIP') ||
            'The collateral currency liquidation rate defines at which market price your collateral will be automatically sold.'}
        </span>
      </div>
    </div>
  );
}
