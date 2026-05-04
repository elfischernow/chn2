'use client';

// 1:1 port of legacy components/authorization/components/forgot-password.

import { useId, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface ForgotPasswordFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onEmailChange: (value: string) => void;
}

export function ForgotPasswordForm({
  state,
  dispatch,
  t,
  onSubmit,
  onEmailChange,
}: ForgotPasswordFormProps) {
  const emailId = useId();
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  return (
    <AuthorizationSection
      className="forgot-password-section"
      title={t('AUTHORIZATION.FORGOT_PASSWORD.TITLE')}
      description={t('AUTHORIZATION.FORGOT_PASSWORD.DESCRIPTION')}
    >
      <form
        className="forgot-password"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          data={{
            type: 'email',
            id: emailId,
            name: 'email',
            placeholder: t('AUTHORIZATION.EMAIL.PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.email,
            isError: !!state.emailError,
            isValid: state.isEmailValid,
            errorText: state.emailError ? t(state.emailError, state.emailError) : null,
            onChange: (e) => onEmailChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_EMAIL_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'email',
          }}
        />
        <NewButton
          className="forgot-password__button"
          disabled={state.isFetching}
          isLoading={state.isFetching}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.FORGOT_PASSWORD.BUTTON')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
