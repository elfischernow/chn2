'use client';

import { useI18n } from '@/lib/i18n/client';
import type { LoanEstimateResponse } from '@/lib/api/coin-rabbit';

interface LoanAprBadgeProps {
  estimate: LoanEstimateResponse | null;
  isLoading?: boolean;
}

/**
 * Compact APR plate rendered under the loan field stack — same slot the
 * other modes use for the cashback Pro upsell. Reads `interestPercent`
 * from the estimate; renders `—%` while loading.
 */
export function LoanAprBadge({ estimate, isLoading = false }: LoanAprBadgeProps) {
  const t = useI18n();
  const pct = (() => {
    if (estimate?.interestPercent == null) return null;
    return `${estimate.interestPercent}%`;
  })();

  return (
    <div className="loan-apr" tabIndex={0} data-loading={isLoading || undefined}>
      <span className="loan-apr-value">{pct ?? '—'}</span>
      <span className="loan-apr-title">
        {t('LOANS.CALCULATOR.APR') || 'APR'}
      </span>
      <span className="loan-apr-tip" role="tooltip">
        <span className="loan-apr-tip-title">
          {t('LOANS.CALCULATOR.ANNUAL_PERCENTAGE_RATE') || 'Annual Percentage Rate'}
        </span>
        <span className="loan-apr-tip-body">
          {t('LOANS.CALCULATOR.APR_TOOLTIP') ||
            'Range of rates shown includes fixed- and variable-rate loans. Rates are not guaranteed and vary based on the credit profile of each applicant.'}
        </span>
      </span>
    </div>
  );
}
