'use client';

// Generic 2FA / GA-code entry form. Used when the user has 2FA enabled
// (`!isConfirmDevice`). Auto-submits when the code reaches 6 chars (with a
// 300ms debounce — fix E8 — and only when captcha already resolved).

import { useEffect, useRef, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { isVerificationCodeValid } from '@/lib/auth/validation';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface SecurityVerificationFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onCodeChange: (value: string) => void;
}

export function SecurityVerificationForm({
  state,
  dispatch,
  t,
  onSubmit,
  onCodeChange,
}: SecurityVerificationFormProps) {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  // Auto-submit when 6 valid digits arrive, but only once per token (E8 fix).
  // Debounce 300ms so paste + edit doesn't trigger double-submit.
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

  return (
    <AuthorizationSection
      className="security-verification"
      title={t('AUTHORIZATION.GOOGLE_AUTHENTICATION.TITLE')}
      description={t('AUTHORIZATION.GOOGLE_AUTHENTICATION.DESCRIPTION')}
    >
      <form
        className="security-verification__form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          className="security-verification__field"
          data={{
            type: 'text',
            id: 'gauth-code',
            name: 'gauth-code',
            placeholder: t('AUTHORIZATION.GOOGLE_AUTHENTICATION.PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.verificationCode,
            isError: !!state.verificationCodeError,
            isValid: state.isVerificationCodeValid,
            errorText: state.verificationCodeError
              ? t(state.verificationCodeError, state.verificationCodeError)
              : null,
            onChange: (e) => onCodeChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_VERIFICATION_CODE_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'one-time-code',
          }}
        />
        <NewButton
          className="security-verification__button"
          disabled={state.isFetching}
          isLoading={state.isFetching}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.SUBMIT')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
