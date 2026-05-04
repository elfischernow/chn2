'use client';

// Registration form. Pixel-perfect port of legacy
// `components/authorization/components/registration/registration.jsx`. The
// agreement copy (terms / privacy / risk / NOW custody) is rendered with
// the same anchor structure so existing translations keep working.

import { useId, type KeyboardEvent, type ReactNode } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { getPasswordQualityData as quality } from '@/lib/auth/validation';

import { CheckIcon } from '../icons/CheckIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { NewAgreement } from '../ui/NewAgreement';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';
import { AuthorizationSection } from '../AuthorizationSection';

import type { AuthDispatch, AuthFormState } from './state';

interface RegistrationFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onLogInClick: () => void;
  onSignUpFromEmailClash: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRepeatedPasswordChange: (value: string) => void;
  isMobile?: boolean;
  socialButtons?: ReactNode;
}

export function RegistrationForm({
  state,
  dispatch,
  t,
  onSubmit,
  onLogInClick,
  onSignUpFromEmailClash,
  onEmailChange,
  onPasswordChange,
  onRepeatedPasswordChange,
  isMobile = false,
  socialButtons,
}: RegistrationFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const repeatedId = useId();

  const linkText = isMobile
    ? t('AUTHORIZATION.LOG_IN')
    : t('AUTHORIZATION.I_HAVE_AN_ACCOUNT');

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit();
  };

  const passwordType = state.isPasswordTextShown ? 'text' : 'password';
  const passwordIconColor = state.password ? '#00C26F' : '#DCE2EA';

  // Show "email already exists" → click to switch to login.
  const isAlreadyExistError =
    state.emailError === 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST';

  const passwordQuality = state.password
    ? (() => {
        const q = quality(state.password);
        return {
          ...q,
          text: t(q.i18nKey),
        };
      })()
    : undefined;

  return (
    <AuthorizationSection
      className="registration-section"
      title={t('AUTHORIZATION.REGISTRATION_TITLE')}
      linkText={linkText}
      linkHandler={onLogInClick}
      recapture={state.recaptureShown}
    >
      <form
        className="registration"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          className="registration__email"
          isErrorWithAction={isAlreadyExistError}
          onErrorClick={onSignUpFromEmailClash}
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
          className="registration__password"
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
                color={passwordIconColor}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })
                }
              />
            ) : null,
          }}
        />
        <NewField
          className="registration__repeated-password"
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

        <NewAgreement
          id="registration"
          className="registration__agreement registration__agreement_second-field"
          required
          disabled={state.isFetching}
          data={{
            isChecked: state.isAgreementChecked,
            isError: state.isAgreementError,
            onChange: () => dispatch({ type: 'TOGGLE_AGREEMENT' }),
            Icon: <CheckIcon />,
          }}
        >
          {t('AUTHORIZATION.AGREEMENT_TEXT')}{' '}
          <a href="https://changenow.io/terms-of-use" target="_blank" rel="noreferrer">
            {t('AUTHORIZATION.TERMS_OF_USE')}
          </a>{' '}
          ,{' '}
          <a href="https://changenow.io/privacy-policy" target="_blank" rel="noreferrer">
            {t('AUTHORIZATION.PRIVACY_POLICY')}
          </a>{' '}
          {t('AUTHORIZATION.AND')}{' '}
          <a
            href="https://changenow.io/risk-disclosure-statement"
            target="_blank"
            rel="noreferrer"
          >
            {t('AUTHORIZATION.RISK_DISCLOSURE')}
          </a>{' '}
          {t('AUTHORIZATION.NOW_CUSTODY_TERMS.TEXT')}{' '}
          <a
            href={t('AUTHORIZATION.NOW_CUSTODY_TERMS.LINK')}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('AUTHORIZATION.NOW_CUSTODY_TERMS.TEXT_FOR_LINK')}
          </a>
        </NewAgreement>

        <NewAgreement
          id="registration-newsletter"
          className="registration__agreement"
          disabled={state.isFetching}
          data={{
            isChecked: state.isSubscribeToNewsletterChecked,
            onChange: () => dispatch({ type: 'TOGGLE_NEWSLETTER' }),
            Icon: <CheckIcon />,
          }}
        >
          {t('AUTHORIZATION.SUBSCRIBE_TO_THE_NEWSLETTER')}
        </NewAgreement>

        <NewButton
          className="registration__button"
          disabled={state.isFetching || state.isGoogleAuthLoading}
          isLoading={state.isFetching || state.isGoogleAuthLoading}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.SIGN_UP')}
        </NewButton>

        {state.oAuthError && (
          <div className="login__error_oauth registration__error">{state.oAuthError}</div>
        )}
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
