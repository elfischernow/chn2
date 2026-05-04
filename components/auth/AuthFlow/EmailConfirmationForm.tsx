'use client';

// Device-confirm via email-code. Used after CODE_NEEDED on
// signup / signin / Google OAuth. Wraps the unified `useResendTimeout` hook
// so the backoff bucket persists across reloads. Closes E23 (legacy had
// two independent timer mechanisms).

import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { emailVerificationResend } from '@/lib/auth/dal';
import { useResendTimeout } from '@/lib/auth/use-resend-timeout';
import { isVerificationCodeValid } from '@/lib/auth/validation';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface EmailConfirmationFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onCodeChange: (value: string) => void;
  /** Discriminator for the resend bucket (e.g. 'login-confirm', 'signup-confirm'). */
  flow?: string;
}

const fillString = (template: string, vars: Record<string, string>): string => {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
  return out;
};

const formatTimer = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function EmailConfirmationForm({
  state,
  dispatch,
  t,
  onSubmit,
  onCodeChange,
  flow = 'device-confirm',
}: EmailConfirmationFormProps) {
  const {
    timeLeft,
    attempts,
    maxAttempts,
    warningThreshold,
    isBlocked,
    beginAttempt,
  } = useResendTimeout(flow);

  const lastSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isVerificationCodeValid(state.verificationCode)) return;
    if (state.verificationCode === lastSubmittedRef.current) return;
    if (state.recaptureShown && !state.captcha) return;
    const id = window.setTimeout(() => {
      lastSubmittedRef.current = state.verificationCode;
      onSubmit();
    }, 300);
    return () => clearTimeout(id);
  }, [state.verificationCode, state.recaptureShown, state.captcha, onSubmit]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  const handleResend = useCallback(async () => {
    if (timeLeft > 0 || isBlocked) return;
    beginAttempt();
    try {
      await emailVerificationResend(state.email);
    } catch {
      // Network errors are benign here — the timer was started.
    }
  }, [timeLeft, isBlocked, beginAttempt, state.email]);

  const isWarning = attempts >= warningThreshold;
  const description = (() => {
    const base = t('AUTHORIZATION.CONFIRM_DEVICE.DESCRIPTION');
    if (!isWarning) return base;
    const remaining = Math.max(0, maxAttempts - attempts);
    const tail = fillString(t('AUTHORIZATION.VERIFICATION.ATTEMPTS', '{ATTEMPTS}'), {
      ATTEMPTS: String(remaining),
    });
    return `${base} ${tail}`;
  })();

  // When the bucket is exhausted, replace inline error text + flag the field
  // (legacy behaviour from email-confirmation.tsx:71-77).
  const fieldErrorText = isBlocked
    ? t('AUTHORIZATION.VERIFICATION.SUPPORT')
    : state.verificationCodeError
      ? t(state.verificationCodeError, state.verificationCodeError)
      : null;

  return (
    <AuthorizationSection
      className="security-verification"
      title={t('AUTHORIZATION.CONFIRM_DEVICE.TITLE')}
      description={description}
    >
      <form
        className="security-verification__form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="security-verification__code-container">
          <span className="security-verification__subtitle">
            {t('AUTHORIZATION.REGISTRATION_CONFIRM.SUBTITLE')}
          </span>
          {timeLeft > 0 ? (
            <span className="security-verification__resend-button security-verification__timer">
              {fillString(
                t('AUTHORIZATION.VERIFICATION.RESEND_CODE_IN_SECONDS', '{TIMER}'),
                { TIMER: formatTimer(timeLeft) },
              )}
            </span>
          ) : (
            <button
              className="security-verification__resend-button"
              type="button"
              disabled={isBlocked}
              onClick={handleResend}
            >
              {t('AUTHORIZATION.VERIFICATION.RESEND_CODE')}
            </button>
          )}
        </div>

        <NewField
          className="security-verification__field"
          isErrorWithAction={isBlocked}
          data={{
            type: 'text',
            id: 'email-confirm-code',
            name: 'email-confirm-code',
            placeholder: t('AUTHORIZATION.REGISTRATION_CONFIRM.PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.verificationCode,
            isError: !!state.verificationCodeError || isBlocked,
            isValid: state.isVerificationCodeValid && !isBlocked,
            errorText: fieldErrorText,
            onChange: (e) => onCodeChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_VERIFICATION_CODE_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'one-time-code',
          }}
        />

        <NewButton
          className="security-verification__button"
          disabled={state.isFetching || isBlocked}
          isLoading={state.isFetching}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.SUBMIT')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
