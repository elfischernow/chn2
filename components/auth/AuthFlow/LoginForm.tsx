'use client';

// Login form. Pixel-perfect port of legacy
// `components/authorization/components/login/login.jsx`. Class names match
// legacy verbatim — styles in components/auth/styles.css apply unchanged.

import { useId, type KeyboardEvent, type ReactNode } from 'react';

import type { TFunction } from '@/lib/i18n/createT';

import { EyeIcon } from '../icons/EyeIcon';
import { NewAgreement } from '../ui/NewAgreement';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';
import { CheckIcon } from '../icons/CheckIcon';
import { AuthorizationSection } from '../AuthorizationSection';

import type { AuthDispatch, AuthFormState } from './state';

interface LoginFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  isMobile?: boolean;
  /** Social-auth row (Google/Metamask/WC) — wired by AuthFlow. */
  socialButtons?: ReactNode;
}

export function LoginForm({
  state,
  dispatch,
  t,
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  onEmailChange,
  onPasswordChange,
  isMobile = false,
  socialButtons,
}: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const linkText = isMobile
    ? t('AUTHORIZATION.REGISTRATION_TITLE')
    : t('AUTHORIZATION.CREATE_ACCOUNT');

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit();
  };

  const passwordType = state.isPasswordTextShown ? 'text' : 'password';
  const passwordIconColor = state.password ? '#00C26F' : '#DCE2EA';

  return (
    <AuthorizationSection
      className="login-section"
      title={t('AUTHORIZATION.LOGIN_TITLE')}
      linkText={linkText}
      linkHandler={onSignUpClick}
    >
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          className="login__email"
          data={{
            type: 'email',
            id: emailId,
            name: 'email',
            placeholder: t('AUTHORIZATION.EMAIL.PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.email,
            isError: !!state.emailError,
            isValid: state.isEmailValid,
            errorText: state.emailError,
            onChange: (e) => onEmailChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_EMAIL_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'email',
          }}
        />
        <NewField
          className="login__password"
          data={{
            type: passwordType,
            id: passwordId,
            name: 'password',
            placeholder: t('AUTHORIZATION.PASSWORD.PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.password,
            isError: !!state.passwordError,
            isValid: state.isPasswordValid,
            errorText: state.passwordError,
            footerLabel: t('AUTHORIZATION.PASSWORD.SECOND_LABEL'),
            onChange: (e) => onPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            onFooterLabelClick: onForgotPasswordClick,
            autoComplete: 'current-password',
            Icon: state.password ? (
              <EyeIcon
                className="authorization__password-icon"
                isShow={state.isPasswordTextShown}
                color={passwordIconColor}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })
                }
              />
            ) : null,
          }}
        />

        {state.isLinkOauth && (
          <NewAgreement
            id="link-oauth-account"
            className="registration__agreement"
            data={{
              isChecked: state.isLinkOauthAccountChecked,
              onChange: () => dispatch({ type: 'TOGGLE_LINK_OAUTH' }),
              Icon: <CheckIcon />,
            }}
          >
            {t('AUTHORIZATION.LINK_OAUTH_ACCOUNT')}
          </NewAgreement>
        )}

        <div className="login-footer">
          {state.oAuthError && (
            <div className="login__error_oauth">{state.oAuthError}</div>
          )}
          <NewButton
            className={[
              'login__button',
              state.recaptureShown ? 'login__button_recapture' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={state.isFetching || state.isGoogleAuthLoading}
            isLoading={state.isFetching || state.isGoogleAuthLoading}
            onClick={onSubmit}
          >
            {t('AUTHORIZATION.LOG_IN')}
          </NewButton>
        </div>
      </form>
      {socialButtons && (
        <>
          <p className="registration__hint">
            <span className="registration__hint__text">
              {t('AUTHORIZATION.ALTERNATE_LOGIN_TEXT')}
            </span>
          </p>
          {socialButtons}
        </>
      )}
    </AuthorizationSection>
  );
}
