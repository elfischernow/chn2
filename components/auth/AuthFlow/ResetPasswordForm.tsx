'use client';

// 1:1 port of legacy components/authorization/components/reset-password.

import { useId, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { getPasswordQualityData as quality } from '@/lib/auth/validation';

import { EyeIcon } from '../icons/EyeIcon';
import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface ResetPasswordFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onPasswordChange: (value: string) => void;
  onRepeatedPasswordChange: (value: string) => void;
}

export function ResetPasswordForm({
  state,
  dispatch,
  t,
  onSubmit,
  onPasswordChange,
  onRepeatedPasswordChange,
}: ResetPasswordFormProps) {
  const passwordId = useId();
  const repeatedId = useId();

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  const passwordType = state.isPasswordTextShown ? 'text' : 'password';
  const passwordQuality = state.password
    ? (() => {
        const q = quality(state.password);
        return { ...q, text: t(q.i18nKey) };
      })()
    : undefined;

  return (
    <AuthorizationSection
      className="forgot-password-section"
      title={t('AUTHORIZATION.RESET_PASSWORD.TITLE')}
      description={t('AUTHORIZATION.RESET_PASSWORD.DESCRIPTION')}
    >
      <form
        className="reset-password"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          className="reset-password__password"
          data={{
            type: passwordType,
            id: passwordId,
            name: 'password',
            placeholder: t('AUTHORIZATION.PASSWORD.PLACEHOLDER_SIGN_UP'),
            floatPlaceholder: true,
            value: state.password,
            isError: !!state.passwordError,
            isValid: state.isPasswordValid,
            errorText: state.passwordError ? t(state.passwordError, state.passwordError) : null,
            prompt: t('AUTHORIZATION.PASSWORD.LENGTH_ERROR'),
            quality: passwordQuality,
            onChange: (e) => onPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'new-password',
            Icon: state.password ? (
              <EyeIcon
                className="authorization__password-icon"
                isShow={state.isPasswordTextShown}
                color={state.password ? '#00C26F' : '#DCE2EA'}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })
                }
              />
            ) : null,
          }}
        />
        <NewField
          className="reset-password__password-repeated"
          data={{
            type: passwordType,
            id: repeatedId,
            name: 'repeated-password',
            placeholder: t('AUTHORIZATION.PASSWORD.REPEAT_PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.repeatedPassword,
            isError: !!state.repeatedPasswordError,
            isValid: state.isRepeatedPasswordValid,
            errorText: state.repeatedPasswordError
              ? t(state.repeatedPasswordError, state.repeatedPasswordError)
              : null,
            onChange: (e) => onRepeatedPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_REPEATED_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'new-password',
            Icon: state.repeatedPassword ? (
              <EyeIcon
                className="authorization__password-icon"
                isShow={state.isPasswordTextShown}
                color={state.repeatedPassword ? '#00C26F' : '#DCE2EA'}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })
                }
              />
            ) : null,
          }}
        />
        <NewButton
          className="reset-password__button"
          disabled={state.isFetching}
          isLoading={state.isFetching}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.CONFIRM')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
