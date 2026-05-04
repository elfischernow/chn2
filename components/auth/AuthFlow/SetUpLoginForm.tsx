'use client';

// 1:1 port of legacy components/authorization/components/set-up-login.
// Used by users who registered via wallet/OAuth and need to attach a
// password-based login. Two-step flow:
//   step 1 (no email-code yet): email + password + repeated → POST /v2/users/set-up-login/web
//   step 2 (server returned CODE_NEEDED): show 6-digit email-code field and POST again
//
// We render only step 1 here. Step 2 reuses the SecurityVerificationForm
// (with isEmailCodeStep=true) because the legacy oracle did the same.

import { useId, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { getPasswordQualityData as quality } from '@/lib/auth/validation';

import { EyeIcon } from '../icons/EyeIcon';
import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface SetUpLoginFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRepeatedPasswordChange: (value: string) => void;
}

export function SetUpLoginForm({
  state,
  dispatch,
  t,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onRepeatedPasswordChange,
}: SetUpLoginFormProps) {
  const emailId = useId();
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
      className="set-up-login"
      title={t('AUTHORIZATION.SET_UP_LOGIN_INFO')}
    >
      <form
        className="set-up-login"
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
            autoComplete: 'off',
          }}
        />
        <NewField
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
        {/* Repeated-password is only revealed once primary password is valid
            (legacy behaviour from set-up-login.jsx:29). */}
        {state.isPasswordValid && (
          <NewField
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
            }}
          />
        )}
        <NewButton className="set-up-login__button" onClick={onSubmit}>
          {t('AUTHORIZATION.SET_UP')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
