'use client';

// Auth orchestrator. Wraps the per-form components, owns the reducer state,
// drives Turnstile, and dispatches submit-handlers. Mirrors the legacy
// `Authorization.jsx` orchestrator (1982 lines), folding the same set of
// sub-forms into one client tree.

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { trackEvent } from '@/lib/analytics/track';
import {
  resolveClientPostAuthTarget,
  POST_AUTH_RELOAD,
} from '@/lib/auth/post-auth.client';
import { sentryReportError } from '@/lib/sentry/report';
import {
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
  validateVerificationCode,
} from '@/lib/auth/validation';
import { createT, type TranslationDict } from '@/lib/i18n/createT';
import { emailVerificationResend } from '@/lib/auth/dal';
import { clearResendBuckets } from '@/lib/auth/use-resend-timeout';

import { EmailConfirmationForm } from './EmailConfirmationForm';
import { EntryForm } from './EntryForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LinkExpiredView } from './LinkExpiredView';
import { LoginForm } from './LoginForm';
import { RegistrationForm } from './RegistrationForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { SecurityVerificationForm } from './SecurityVerificationForm';
import { SetUpLoginForm } from './SetUpLoginForm';
import { SetUpWalletView } from './SetUpWalletView';
import { SuccessView } from './SuccessView';
import { initialState, reducer, type FormName } from './state';
import {
  performAuthenticateSubmit,
  performChangePasswordSubmit,
  performEntrySignup,
  performForgotPasswordSubmit,
  performLoginSubmit,
  performRegisterSubmit,
  performResetPasswordSubmit,
  performSetUpLoginSubmit,
} from './submit-handlers';
import { ChangePasswordForm } from './ChangePasswordForm';
import { MetamaskLogin } from '../social/MetamaskLogin';
import { WalletConnectModal } from '../social/WalletConnectModal';

import {
  ConfirmedIcon,
  ErrorIcon,
  MailSuccessIcon,
  SuccessIcon,
} from '../icons/MailSuccessIcon';
import { Turnstile, type TurnstileHandle } from '../ui/Turnstile';
import { SocialButtons } from '../social/SocialButtons';
import { AUTH_ERRORS, AUTH_GOOGLE_ERRORS } from '@/lib/auth/constants';

const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export type InitialForm = 'entry' | 'login' | 'register' | 'reset-password';

interface AuthFlowProps {
  initialForm: InitialForm;
  /** Pre-resolved post-auth target (server-side, from `?next` or default). */
  postAuthTarget: string;
  /** Locale prefix (`''` or `/ru`). */
  localePrefix: string;
  /** Translation dict — passed from server component. We rebuild `t` here
      because functions cannot cross the RSC boundary. */
  dict: TranslationDict;
  /** Reset token from `?resetToken=` on /authorization. */
  resetToken?: string | null;
  isMobile?: boolean;
}

// The standalone /authorization page renders the unified entry form by
// default. Legacy `?form=login` / `?form=register` deep-links collapse to
// the same entry view — there's no separate login/register page anymore.
// `?form=entry` is accepted for explicitness but is the default and not
// written back to the URL.
const FORM_QUERY_TO_NAME: Record<string, FormName> = {
  entry: 'entry',
  login: 'entry',
  register: 'entry',
  forgot: 'forgot-password',
  reset: 'reset-password',
  '2fa': 'security-verification',
};

const FORM_NAME_TO_QUERY: Partial<Record<FormName, string>> = {
  // entry is the default form — omitted so the URL stays clean.
  'forgot-password': 'forgot',
  'reset-password': 'reset',
  'security-verification': '2fa',
};

export function AuthFlow({
  initialForm,
  postAuthTarget,
  localePrefix,
  dict,
  resetToken = null,
  isMobile = false,
}: AuthFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useMemo(() => createT(dict), [dict]);

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    currentForm: initialForm,
    resetToken,
  });

  const turnstileRef = useRef<TurnstileHandle | null>(null);

  // Sync `?form=` query → state. Allows shareable URLs and browser back/forward.
  useEffect(() => {
    const formParam = searchParams.get('form');
    if (formParam && FORM_QUERY_TO_NAME[formParam]) {
      const target = FORM_QUERY_TO_NAME[formParam];
      if (target !== state.currentForm) {
        dispatch({ type: 'SET_FORM', form: target, remember: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pushFormUrl = useCallback(
    (form: FormName) => {
      const q = FORM_NAME_TO_QUERY[form];
      const params = new URLSearchParams(searchParams.toString());
      if (q && q !== initialForm) {
        params.set('form', q);
      } else {
        params.delete('form');
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams, initialForm],
  );

  useEffect(() => {
    pushFormUrl(state.currentForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentForm]);

  // Per-second resend timer (legacy authorization.jsx:287-301).
  useEffect(() => {
    if (state.timerNumber === null || state.timerNumber <= 0) return;
    const id = window.setTimeout(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    return () => clearTimeout(id);
  }, [state.timerNumber]);

  const handleEmailChange = useCallback((value: string) => {
    dispatch({
      type: 'SET_EMAIL',
      value,
      isValid: value.length > 0 && validateEmail(value),
    });
  }, []);

  const handlePasswordChange = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_PASSWORD',
        value,
        passwordError: validatePassword(value),
        matchesRepeated:
          state.repeatedPassword.length > 0 && value === state.repeatedPassword,
      });
    },
    [state.repeatedPassword],
  );

  const handleRepeatedPasswordChange = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_REPEATED_PASSWORD',
        value,
        error: validatePasswordsMatch(state.password, value),
      });
    },
    [state.password],
  );

  const track = useCallback((event: { category: string; action: string; label?: string }) => {
    trackEvent(event);
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug('[track]', event);
    }
  }, []);

  const reportError = useCallback(
    (report: { error: Error; type: string; status: number | null; errorMessage: string }) => {
      sentryReportError({
        error: report.error,
        type: report.type,
        status: report.status,
        errorMessage: report.errorMessage,
      });
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[sentry]', report.type, report.errorMessage, report.status);
      }
    },
    [],
  );

  const obtainCaptcha = useCallback(async () => {
    if (!turnstileRef.current) return '';
    return turnstileRef.current.executeAsync();
  }, []);

  const resetCaptcha = useCallback(() => {
    turnstileRef.current?.reset();
  }, []);

  const redirectAfterAuth = useCallback(() => {
    const fromPathname =
      typeof window !== 'undefined' ? window.location.pathname : undefined;
    const proExchangeMode =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('proExchangeMode') === 'true';
    const target = resolveClientPostAuthTarget({
      serverTarget: postAuthTarget,
      localePrefix,
      fromPathname,
      proExchangeMode,
    });
    if (target === POST_AUTH_RELOAD) {
      router.refresh();
      return;
    }
    window.location.assign(target);
  }, [postAuthTarget, localePrefix, router]);

  const handleLoginSubmit = useCallback(() => {
    void performLoginSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: redirectAfterAuth,
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError, redirectAfterAuth]);

  // Entry submit — routes by `state.entryMode`:
  //   'fresh'          → performLoginSubmit (signin probe). On INVALID_CREDENTIALS
  //                      the handler flips entryMode to 'suggest-signup'.
  //   'suggest-signup' → performEntrySignup (single-password signup with
  //                      the agreement+newsletter from the inline banner).
  const handleEntrySubmit = useCallback(() => {
    if (state.entryMode === 'suggest-signup') {
      void performEntrySignup({
        state,
        dispatch,
        obtainCaptcha,
        resetCaptcha,
        track,
        reportError,
        onSuccess: redirectAfterAuth,
      });
      return;
    }
    void performLoginSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: redirectAfterAuth,
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError, redirectAfterAuth]);

  const handleRegisterSubmit = useCallback(() => {
    void performRegisterSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: redirectAfterAuth,
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError, redirectAfterAuth]);

  const handleForgotPasswordSubmit = useCallback(() => {
    void performForgotPasswordSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: () => {
        // Already handled in submit (form switch + timer).
      },
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError]);

  const handleResetPasswordSubmit = useCallback(() => {
    void performResetPasswordSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: () => {
        // success view rendered; user clicks "Done" to go to LOGIN.
      },
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError]);

  // After unification there's only one entry — both "back to login" and "go
  // create an account" return users to the same unified screen. The fresh
  // mount also wipes lingering form state.
  const handleSwitchToLogin = useCallback(() => {
    dispatch({ type: 'CLEAR_FORM' });
    router.push(`${localePrefix}/authorization`);
  }, [router, localePrefix]);

  // Retained for backwards compat with embedded callers (e.g. modal mode in
  // calculator) that still call onSignUpClick; routes through the unified
  // entry now that /registration redirects to /authorization.
  const handleSwitchToRegister = handleSwitchToLogin;

  const handleForgotPasswordClick = useCallback(() => {
    dispatch({ type: 'CLEAR_PASSWORDS' });
    dispatch({ type: 'SET_FORM', form: 'forgot-password', remember: true });
  }, []);

  const handleResetSuccessDone = useCallback(() => {
    dispatch({ type: 'CLEAR_FORM' });
    handleSwitchToLogin();
  }, [handleSwitchToLogin]);

  const handleVerificationCodeChange = useCallback((value: string) => {
    // Strip spaces in-place (legacy authorization.jsx:594).
    const next = value.replace(/\s/g, '');
    dispatch({
      type: 'SET_VERIFICATION_CODE',
      value: next,
      error: validateVerificationCode(next),
    });
  }, []);

  const handle2FaSubmit = useCallback(() => {
    void performAuthenticateSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      onSuccess: redirectAfterAuth,
      isConfirmDevice: state.isConfirmDevice,
      googleJwtToken: state.googleJwtToken,
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError, redirectAfterAuth]);

  // ─── Google OAuth ────────────────────────────────────────────────────
  // Mirrors handleGoogleAuthError + handleGoogleAuthSuccess from
  // legacy authorization.jsx:685-768. The DAL call lives in GoogleAuthButton —
  // we only react to its success/error here.
  const handleGoogleSuccess = useCallback(() => {
    dispatch({ type: 'SET_GOOGLE_LOADING', value: false });
    dispatch({ type: 'SET_OAUTH_ERROR', error: null });
    track({ category: 'google-auth', action: 'google-success-sign-in' });
    clearResendBuckets('login-confirm', 'signup-confirm', 'register-confirm');
    redirectAfterAuth();
  }, [redirectAfterAuth, track]);

  const handleGoogleError = useCallback(
    (rawData: unknown, jwt?: string) => {
      dispatch({ type: 'SET_GOOGLE_LOADING', value: false });
      dispatch({ type: 'SET_OAUTH_ERROR', error: null });

      const data = (rawData ?? {}) as {
        errorData?: { message?: string; status?: number; email?: string } | null;
        status?: number;
        code?: string;
        email?: string;
      };
      const errorStatus = data.status ?? data.errorData?.status;
      const errorMessage = data.errorData?.message;
      const email = data.errorData?.email ?? data.email ?? '';
      const codeError = data.code;

      if (jwt) dispatch({ type: 'SET_GOOGLE_JWT', token: jwt });

      if (data.errorData === null || errorStatus === 404) {
        dispatch({
          type: 'SET_OAUTH_ERROR',
          error: 'AUTHORIZATION.OAUTH.GOOGLE_ERROR.DATA_ERROR',
        });
        return;
      }

      if (errorMessage === AUTH_GOOGLE_ERRORS.EMAIL_ALREADY_EXISTS) {
        // Switch to LOGIN with the email pre-filled and password marked as the
        // place to type it. This matches legacy lines 706-717.
        dispatch({
          type: 'SET_EMAIL',
          value: email,
          isValid: email.includes('@'),
        });
        dispatch({ type: 'SET_LINK_OAUTH', value: true });
        dispatch({
          type: 'SET_PASSWORD_ERROR',
          error: 'AUTHORIZATION.OAUTH.GOOGLE_ERROR.EMAIL_ALREADY_EXISTS',
        });
        dispatch({ type: 'SET_FORM', form: 'entry', remember: true });
        return;
      }

      if (
        errorMessage === AUTH_ERRORS.FA_CODE_NEEDED ||
        codeError === AUTH_ERRORS.FA_CODE_NEEDED
      ) {
        dispatch({
          type: 'SET_EMAIL',
          value: email,
          isValid: email.includes('@'),
        });
        dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
        return;
      }

      if (errorMessage === AUTH_ERRORS.CODE_NEEDED) {
        dispatch({
          type: 'SET_EMAIL',
          value: email,
          isValid: email.includes('@'),
        });
        dispatch({ type: 'SET_CONFIRM_DEVICE', value: true });
        dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
        return;
      }

      // Default — generic data error + Sentry. Fixes E5 (legacy fell through
      // to a "success" branch on unknown errors).
      dispatch({
        type: 'SET_OAUTH_ERROR',
        error: 'AUTHORIZATION.OAUTH.GOOGLE_ERROR.DATA_ERROR',
      });
      reportError({
        error: new Error(errorMessage ?? 'google oauth unknown'),
        type: 'login_error',
        status: errorStatus ?? null,
        errorMessage: errorMessage ?? 'google oauth unknown',
      });
    },
    [reportError],
  );

  const handleGoogleLoadingChange = useCallback(
    (loading: boolean) => {
      dispatch({ type: 'SET_GOOGLE_LOADING', value: loading });
      if (loading) {
        dispatch({ type: 'SET_OAUTH_ERROR', error: null });
      }
    },
    [],
  );

  // ─── Metamask click → switch to MM_LOGIN/MM_REGISTRATION ─────────────
  const handleMetamaskClick = useCallback(() => {
    const target =
      state.currentForm === 'register' ? 'metamask-register' : 'metamask-login';
    dispatch({ type: 'SET_FORM', form: target, remember: true });
  }, [state.currentForm]);

  // ─── WalletConnect outcomes ──────────────────────────────────────────
  const handleWalletConnectSuccess = useCallback(() => {
    track({ category: 'authorization', action: 'wallet-connect-auth' });
    redirectAfterAuth();
  }, [track, redirectAfterAuth]);
  const handleWalletConnectTwoFa = useCallback(() => {
    dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
  }, []);

  // ─── set-up-login / set-up-wallet ────────────────────────────────────
  const handleSetUpLoginSubmit = useCallback(() => {
    void performSetUpLoginSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      isEmailCodeStep: state.isEmailCodeStep,
      onSuccess: redirectAfterAuth,
      onCodeStepRequired: () => undefined,
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError, redirectAfterAuth]);

  const handleSetUpWalletMetamaskClick = useCallback(() => {
    dispatch({ type: 'SET_FORM', form: 'set-up-metamask', remember: true });
  }, []);
  const handleSetUpWalletWcClick = useCallback(() => {
    dispatch({ type: 'SET_FORM', form: 'set-up-walletconnect', remember: true });
  }, []);

  // ─── change-password ─────────────────────────────────────────────────
  const handleOldPasswordChange = useCallback((value: string) => {
    dispatch({
      type: 'SET_OLD_PASSWORD',
      value,
      passwordError: validatePassword(value),
    });
  }, []);

  const handleChangePasswordSubmit = useCallback(() => {
    void performChangePasswordSubmit({
      state,
      dispatch,
      obtainCaptcha,
      resetCaptcha,
      track,
      reportError,
      // Server tells us via `user.isTwoFactorEnabled` whether this is required;
      // for now the orchestrator doesn't have user context, so always assume
      // false and let the change-password DAL surface 2FA-required errors.
      isTwoFactorEnabled: false,
      code: state.verificationCode || undefined,
      onSuccess: () => undefined,
      onTwoFactorRequired: () => {
        dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
      },
    });
  }, [state, obtainCaptcha, resetCaptcha, track, reportError]);

  // ─── back-button (E17 fix: remembers prevForm) ────────────────────────
  const handleBack = useCallback(() => {
    if (state.currentForm === 'reset-password') {
      dispatch({ type: 'SET_FORM', form: 'forgot-password' });
      return;
    }
    if (state.currentForm === 'connection-error') {
      const target = state.prevForm ?? 'login';
      dispatch({ type: 'SET_FORM', form: target });
      return;
    }
    dispatch({ type: 'SET_FORM', form: state.prevForm ?? 'login' });
    dispatch({ type: 'RESET_CAPTCHA' });
  }, [state.currentForm, state.prevForm]);

  const isBackButtonShown =
    state.currentForm === 'forgot-password' ||
    state.currentForm === 'reset-password' ||
    state.currentForm === 'reset-password-link-not-found' ||
    state.currentForm === 'forgot-password-success' ||
    state.currentForm === 'connection-error';

  // ─── render per-form ──────────────────────────────────────────────────

  return (
    <div className="authorization">
      {isBackButtonShown && (
        <button className="authorization__back" onClick={handleBack} type="button">
          <span>{t('AUTHORIZATION.BACK_BUTTON_TEXT')}</span>
        </button>
      )}

      <Turnstile
        ref={turnstileRef}
        sitekey={TURNSTILE_SITEKEY}
        onSuccess={(token) => dispatch({ type: 'SET_CAPTCHA', token })}
      />

      {state.currentForm === 'entry' && (
        <EntryForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handleEntrySubmit}
          onForgotPasswordClick={handleForgotPasswordClick}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          socialButtons={
            <SocialButtons
              page={state.entryMode === 'suggest-signup' ? 'register' : 'login'}
              t={t}
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
              onGoogleLoadingChange={handleGoogleLoadingChange}
              onMetamaskClick={handleMetamaskClick}
              onWalletConnectSuccess={handleWalletConnectSuccess}
              onWalletConnectTwoFa={handleWalletConnectTwoFa}
            />
          }
        />
      )}
      {/* Legacy `?form=login`/`?form=register` deep-links now map to entry
          (see FORM_QUERY_TO_NAME), so these renders only fire when something
          else dispatches SET_FORM 'login' or 'register' directly — currently
          nothing in the standalone flow does. Kept as fallbacks for embedded
          modal/test contexts. */}
      {state.currentForm === 'login' && (
        <LoginForm
          state={state}
          dispatch={dispatch}
          t={t}
          isMobile={isMobile}
          onSubmit={handleLoginSubmit}
          onSignUpClick={handleSwitchToRegister}
          onForgotPasswordClick={handleForgotPasswordClick}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          socialButtons={
            <SocialButtons
              page="login"
              t={t}
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
              onGoogleLoadingChange={handleGoogleLoadingChange}
              onMetamaskClick={handleMetamaskClick}
              onWalletConnectSuccess={handleWalletConnectSuccess}
              onWalletConnectTwoFa={handleWalletConnectTwoFa}
            />
          }
        />
      )}
      {state.currentForm === 'register' && (
        <RegistrationForm
          state={state}
          dispatch={dispatch}
          t={t}
          isMobile={isMobile}
          onSubmit={handleRegisterSubmit}
          onLogInClick={handleSwitchToLogin}
          onSignUpFromEmailClash={handleSwitchToLogin}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onRepeatedPasswordChange={handleRepeatedPasswordChange}
          socialButtons={
            <SocialButtons
              page="register"
              t={t}
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
              onGoogleLoadingChange={handleGoogleLoadingChange}
              onMetamaskClick={handleMetamaskClick}
              onWalletConnectSuccess={handleWalletConnectSuccess}
              onWalletConnectTwoFa={handleWalletConnectTwoFa}
            />
          }
        />
      )}

      {state.currentForm === 'forgot-password' && (
        <ForgotPasswordForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handleForgotPasswordSubmit}
          onEmailChange={handleEmailChange}
        />
      )}

      {state.currentForm === 'forgot-password-success' && (
        <SuccessView
          title={t('AUTHORIZATION.EMAIL_TEXTS.CHECK_EMAIL')}
          // Email is rendered as a separate JSX node (sentry-mask) instead of
          // interpolated into an HTML string — guards against malformed emails
          // breaking out of the description block.
          description={
            <>
              {t('AUTHORIZATION.EMAIL_TEXTS.DESCRIPTION_1')}{' '}
              <span className="sentry-mask">{state.email}</span>{' '}
              {t('AUTHORIZATION.EMAIL_TEXTS.DESCRIPTION_2')}
            </>
          }
          Icon={<MailSuccessIcon />}
          buttonText={
            state.timerNumber && state.timerNumber > 0
              ? `${t('AUTHORIZATION.EMAIL_TEXTS.BUTTON')} ${t('AUTHORIZATION.IN')}`
              : t('AUTHORIZATION.EMAIL_TEXTS.BUTTON')
          }
          onButtonClick={handleForgotPasswordSubmit}
          time={state.timerNumber}
          disabled={!!(state.timerNumber && state.timerNumber > 0)}
        />
      )}

      {state.currentForm === 'reset-password' && state.resetToken && (
        <ResetPasswordForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handleResetPasswordSubmit}
          onPasswordChange={handlePasswordChange}
          onRepeatedPasswordChange={handleRepeatedPasswordChange}
        />
      )}

      {state.currentForm === 'reset-password-success' && (
        <SuccessView
          title={t('AUTHORIZATION.RESET_PASSWORD.PASSWORD_UPDATED')}
          Icon={<ConfirmedIcon />}
          buttonText={t('AUTHORIZATION.RESET_PASSWORD.BUTTON')}
          onButtonClick={handleResetSuccessDone}
        />
      )}

      {state.currentForm === 'reset-password-link-not-found' && (
        <LinkExpiredView
          t={t}
          title={t('AUTHORIZATION.CONNECT_ERROR')}
          description={t('AUTHORIZATION.EMAIL_TEXTS.LINK_EXPIRED_DESCRIPTION')}
          Icon={<ErrorIcon />}
          buttonText={
            state.timerNumber && state.timerNumber > 0
              ? `${t('AUTHORIZATION.EMAIL_TEXTS.LINK_EXPIRED_TRY_AGAIN')} ${t('AUTHORIZATION.IN')}`
              : t('AUTHORIZATION.EMAIL_TEXTS.LINK_EXPIRED_TRY_AGAIN')
          }
          onButtonClick={handleForgotPasswordSubmit}
          time={state.timerNumber}
          disabled={!!(state.timerNumber && state.timerNumber > 0)}
          // E7 fix: explicit "Back to login" so user isn't trapped here.
          onBackClick={handleSwitchToLogin}
        />
      )}

      {state.currentForm === 'register-success' && (
        <SuccessView
          title={t('AUTHORIZATION.EMAIL_TEXTS.CHECK_EMAIL')}
          description={
            <>
              {t('AUTHORIZATION.EMAIL_TEXTS.DESCRIPTION_3')}{' '}
              <span className="sentry-mask">{state.email.toLowerCase()}</span>{' '}
              {t('AUTHORIZATION.EMAIL_TEXTS.DESCRIPTION_4')}
            </>
          }
          Icon={<MailSuccessIcon />}
          buttonText={
            state.timerNumber && state.timerNumber > 0
              ? `${t('AUTHORIZATION.EMAIL_TEXTS.BUTTON_2')} ${t('AUTHORIZATION.IN')}`
              : t('AUTHORIZATION.EMAIL_TEXTS.LINK_EXPIRED_TRY_AGAIN')
          }
          onButtonClick={async () => {
            // Re-trigger /email-verification/resend with a fresh 60s lockout
            // on the button. Errors are benign — the timer already started, so
            // we let the user try again after it expires.
            if (state.timerNumber && state.timerNumber > 0) return;
            dispatch({ type: 'SET_TIMER', seconds: 60 });
            try {
              await emailVerificationResend(state.email);
            } catch {
              /* silent — timer already debounces */
            }
          }}
          time={state.timerNumber}
          disabled={!!(state.timerNumber && state.timerNumber > 0)}
        />
      )}

      {state.currentForm === 'connection-error' && (
        <SuccessView
          title={t('AUTHORIZATION.CONNECT_ERROR')}
          description={t('AUTHORIZATION.CONNECT_ERROR_TEXT')}
          Icon={<ErrorIcon />}
          buttonText={t('AUTHORIZATION.CONNECT_ERROR_BUTTON_TEXT')}
          onButtonClick={() => {
            window.open('https://support.changenow.io/hc/en-us/requests/new', '_blank');
          }}
        />
      )}

      {state.currentForm === 'security-verification' && state.isConfirmDevice && (
        <EmailConfirmationForm
          state={state}
          dispatch={dispatch}
          t={t}
          flow={state.prevForm === 'register' ? 'signup-confirm' : 'login-confirm'}
          onSubmit={handle2FaSubmit}
          onCodeChange={handleVerificationCodeChange}
        />
      )}
      {state.currentForm === 'security-verification' && !state.isConfirmDevice && (
        <SecurityVerificationForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handle2FaSubmit}
          onCodeChange={handleVerificationCodeChange}
        />
      )}

      {state.currentForm === 'metamask-login' && (
        <MetamaskLogin
          t={t}
          onAuthSuccess={redirectAfterAuth}
          onTwoFaRequired={() =>
            dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true })
          }
        />
      )}
      {state.currentForm === 'metamask-register' && (
        <MetamaskLogin
          t={t}
          registration
          onAuthSuccess={redirectAfterAuth}
          onTwoFaRequired={() =>
            dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true })
          }
        />
      )}

      {state.currentForm === 'set-up-login' && (
        <SetUpLoginForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handleSetUpLoginSubmit}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onRepeatedPasswordChange={handleRepeatedPasswordChange}
        />
      )}

      {state.currentForm === 'set-up-wallet' && (
        <SetUpWalletView
          t={t}
          onMetamaskClick={handleSetUpWalletMetamaskClick}
          onWalletConnectClick={handleSetUpWalletWcClick}
        />
      )}

      {state.currentForm === 'set-up-metamask' && (
        <MetamaskLogin
          t={t}
          walletSetUp
          onAuthSuccess={() => {
            dispatch({ type: 'SET_FORM', form: 'entry' });
          }}
          onTwoFaRequired={() =>
            dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true })
          }
        />
      )}

      {state.currentForm === 'set-up-walletconnect' && (
        <WalletConnectModal
          t={t}
          onComplete={() => {
            dispatch({ type: 'SET_FORM', form: 'entry' });
          }}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}

      {state.currentForm === 'change-password' && (
        <ChangePasswordForm
          state={state}
          dispatch={dispatch}
          t={t}
          onSubmit={handleChangePasswordSubmit}
          onOldPasswordChange={handleOldPasswordChange}
          onPasswordChange={handlePasswordChange}
          onRepeatedPasswordChange={handleRepeatedPasswordChange}
        />
      )}
      {state.currentForm === 'change-password-success' && (
        <SuccessView
          title={t('AUTHORIZATION.CHANGE_PASSWORD.PASSWORD_SUCCESS')}
          Icon={<SuccessIcon />}
          buttonText={t('AUTHORIZATION.DONE')}
          onButtonClick={handleSwitchToLogin}
        />
      )}
      {state.currentForm === 'email-confirmed' && (
        <SuccessView
          title={t('AUTHORIZATION.EMAIL_TEXTS.EMAIL_CONFIRMED')}
          Icon={<SuccessIcon />}
          buttonText={t('AUTHORIZATION.EMAIL_TEXTS.BUTTON_3')}
          onButtonClick={handleSwitchToLogin}
        />
      )}
      {state.currentForm === 'link-expired' && (
        <LinkExpiredView
          t={t}
          title={t('AUTHORIZATION.CONNECT_ERROR')}
          description={t('AUTHORIZATION.EMAIL_TEXTS.LINK_EXPIRED_DESCRIPTION')}
          Icon={<ErrorIcon />}
          onBackClick={handleSwitchToLogin}
        />
      )}

      {/* Suppress unused-import warning when SuccessIcon is referenced. */}
      <span style={{ display: 'none' }} aria-hidden>
        <SuccessIcon />
      </span>
    </div>
  );
}
