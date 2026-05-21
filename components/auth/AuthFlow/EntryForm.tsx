'use client';

// Unified entry form for /authorization. One screen, one CTA — replaces the
// legacy "I have an account" / "Create account" dichotomy.
//
// Flow:
//   1. User types email + password, presses Continue.
//   2. Submit handler attempts signin first.
//      - 204 / 200-without-2FA-code  → logged in, redirect.
//      - 200 + `code: 2FA_CODE_NEEDED` → switch to SecurityVerification.
//      - 4xx `AUTH.CODE_NEEDED`        → device-confirm via EmailConfirmation.
//      - 4xx `AUTH.CAPTCHA_NEEDED`     → show Turnstile, user re-clicks.
//      - 401 `INVALID_CREDENTIALS`     → flip `entryMode` to 'suggest-signup'.
//                                        Banner appears with agreement +
//                                        newsletter, CTA becomes "Create
//                                        account". Next click runs signup
//                                        with same email+password.
//
// The form is intentionally agnostic about whether the user is new or
// returning. The only visual hint that we're about to register them is the
// banner that appears AFTER the signin probe — they always know what they're
// agreeing to before the account is created.

import { useId, type KeyboardEvent, type ReactNode } from 'react';

import type { TFunction } from '@/lib/i18n/createT';

import { EyeIcon } from '../icons/EyeIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { AuthorizationSection } from '../AuthorizationSection';
import { NewAgreement } from '../ui/NewAgreement';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface EntryFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onForgotPasswordClick: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  /** Social-auth row (Google/Metamask/WC). */
  socialButtons?: ReactNode;
}

export function EntryForm({
  state,
  dispatch,
  t,
  onSubmit,
  onForgotPasswordClick,
  onEmailChange,
  onPasswordChange,
  socialButtons,
}: EntryFormProps) {
  const emailId = useId();
  const passwordId = useId();

  const isSuggestSignup = state.entryMode === 'suggest-signup';

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  const passwordType = state.isPasswordTextShown ? 'text' : 'password';
  const passwordIconColor = state.password ? '#00C26F' : '#DCE2EA';

  const title = isSuggestSignup
    ? t('AUTHORIZATION.ENTRY.SUGGEST_SIGNUP.TITLE', 'One step from your account')
    : t('AUTHORIZATION.ENTRY.TITLE', 'Get started in seconds');
  const subtitle = isSuggestSignup
    ? t(
        'AUTHORIZATION.ENTRY.SUGGEST_SIGNUP.SUBTITLE',
        "We didn't find an account for this email. Use the password above to create one — it takes a second.",
      )
    : t(
        'AUTHORIZATION.ENTRY.SUBTITLE',
        "Sign in or create an account with one form — we'll figure it out from your email.",
      );
  const ctaText = isSuggestSignup
    ? t('AUTHORIZATION.ENTRY.SUGGEST_SIGNUP.CTA', 'Create my account')
    : t('AUTHORIZATION.ENTRY.CTA', 'Continue');

  return (
    <AuthorizationSection
      className="login-section auth-entry"
      title={title}
      description={subtitle}
      recapture={state.recaptureShown}
    >
      <form
        className="login auth-entry__form"
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
            floatPlaceholder: false,
            value: state.email,
            isError: !!state.emailError,
            isValid: state.isEmailValid,
            errorText: state.emailError
              ? t(state.emailError, state.emailError)
              : null,
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
            floatPlaceholder: false,
            value: state.password,
            isError: !!state.passwordError,
            isValid: state.isPasswordValid,
            errorText: state.passwordError
              ? t(state.passwordError, state.passwordError)
              : null,
            // Hide "Forgot password?" once we've flipped into "create an
            // account" mode — it would lead to a confusing dead-end (we
            // already told the user there's no account for this email).
            footerLabel: isSuggestSignup
              ? undefined
              : t('AUTHORIZATION.PASSWORD.SECOND_LABEL'),
            onChange: (e) => onPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            onFooterLabelClick: isSuggestSignup ? undefined : onForgotPasswordClick,
            autoComplete: isSuggestSignup ? 'new-password' : 'current-password',
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

        {isSuggestSignup && (
          <div className="auth-entry__signup-block">
            <NewAgreement
              id="entry-agreement"
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
              <a
                href="https://changenow.io/terms-of-use"
                target="_blank"
                rel="noreferrer"
              >
                {t('AUTHORIZATION.TERMS_OF_USE')}
              </a>{' '}
              ,{' '}
              <a
                href="https://changenow.io/privacy-policy"
                target="_blank"
                rel="noreferrer"
              >
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
              id="entry-newsletter"
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
          </div>
        )}

        <div className="login-footer">
          {state.oAuthError && (
            <div className="login__error_oauth">
              {t(state.oAuthError, state.oAuthError)}
            </div>
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
            {ctaText}
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
