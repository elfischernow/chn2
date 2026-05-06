'use client';

import { useId } from 'react';

import { useI18n } from '@/lib/i18n/client';

interface ConfirmationAgreementsProps {
  changenowAgreed: boolean;
  thirdPartyAgreed: boolean;
  showThirdParty: boolean;
  onChangenowChange: (next: boolean) => void;
  onThirdPartyChange: (next: boolean) => void;
  /** Locale prefix for the doc links (`/ru`, or `''` for English). */
  localePrefix: string;
}

/**
 * Two ToS checkboxes. Mirrors the legacy `coniframtion-agreements.jsx`:
 * the first one is always shown (Terms / Privacy / Risk Disclosure
 * agreement); the second only when the FROM currency is fiat (the
 * third-party-provider FAQ link).
 */
export function ConfirmationAgreements({
  changenowAgreed,
  thirdPartyAgreed,
  showThirdParty,
  onChangenowChange,
  onThirdPartyChange,
  localePrefix,
}: ConfirmationAgreementsProps) {
  const t = useI18n();
  const cnId = useId();
  const tpId = useId();
  const prefix = localePrefix.replace(/\/$/, '');

  return (
    <div className="ex-tos">
      <label className="ex-tos-row" htmlFor={cnId}>
        <input
          id={cnId}
          type="checkbox"
          className="ex-tos-cb"
          checked={changenowAgreed}
          onChange={(e) => onChangenowChange(e.target.checked)}
        />
        <span className="ex-tos-text">
          {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.TEXT_1')}
          {' '}
          <a href={`${prefix}/terms-of-use`} target="_blank" rel="noopener noreferrer">
            {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.TERMS_OF_USE_LINK')}
          </a>
          {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.TEXT_3')}
          <a href={`${prefix}/privacy-policy`} target="_blank" rel="noopener noreferrer">
            {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.PRIVACY_POLICY_LINK')}
          </a>{' '}
          {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.TEXT_2')}{' '}
          <a href={`${prefix}/risk-disclosure-statement`} target="_blank" rel="noopener noreferrer">
            {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CHANGENOW_AGREEMENTS.RISK_DISCLOSURE')}
          </a>
        </span>
      </label>

      {showThirdParty && (
        <label className="ex-tos-row" htmlFor={tpId}>
          <input
            id={tpId}
            type="checkbox"
            className="ex-tos-cb"
            checked={thirdPartyAgreed}
            onChange={(e) => onThirdPartyChange(e.target.checked)}
          />
          <span className="ex-tos-text">
            {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.THIRD_PARTY_AGREEMENTS.TEXT_1')}
            {' '}
            <a
              href={`${prefix}/faq/third-party-service`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.THIRD_PARTY_AGREEMENTS.FAQ_LINK')}
            </a>
          </span>
        </label>
      )}
    </div>
  );
}
