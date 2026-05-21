// Submit logic for LOGIN and REGISTRATION. Each handler mirrors its legacy
// counterpart in `legacy-projects/.../authorization.jsx`:
//   signInUser  → handleLoginSubmit  (lines 929-1070)
//   registerUser → handleRegisterSubmit (lines 770-861)
//
// Important contract differences from legacy (intentional, see migration plan):
//   E2: register success without `CODE_NEEDED` switches to REGISTER_SUCCESS
//       state with a 60s resend timer instead of silently doing nothing.
//   E4: every error branch ends with `return`. Default → toast generic error.
//   E15: email is `.toLowerCase().trim()` for BOTH register and login.
//   E17: CONNECTION_ERROR back-button now remembers the previous form via
//        `prevForm` (we set `remember: true` in SET_FORM).
//   E19: empty 200/204 response is treated as success, not connection-error.

import {
  AUTH_ERRORS,
  AUTHORIZATION_ERRORS,
  CHANGE_PASSWORD_ERRORS,
  DEFAULT_TIMER_NUMBER,
  SENTRY_ERRORS_TYPES,
} from '@/lib/auth/constants';
import {
  changePassword as changePasswordDal,
  forgotPassword,
  googleOauth,
  resetPassword,
  setUpLogin,
  signin,
  signup,
  twoFaAuthenticate,
} from '@/lib/auth/dal';
import { isTwoFactorCodeArrayError } from '@/lib/auth/error-mapper';
import { USERS_ERRORS } from '@/lib/auth/constants';
import { mapAuthError } from '@/lib/auth/error-mapper';
import { getLandingPage } from '@/lib/auth/landing-page';
import { getUtms } from '@/lib/auth/utm';
import { clearResendBuckets } from '@/lib/auth/use-resend-timeout';
import {
  isPasswordValid as validatePasswordOk,
  validatePassword,
  validatePasswordsMatch,
  validateEmail,
  normalizeEmail,
} from '@/lib/auth/validation';

import type { AuthDispatch, AuthFormState } from './state';

interface SubmitDeps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  /** Lazy captcha trigger — resolves to a token (or '' when no sitekey). */
  obtainCaptcha: () => Promise<string>;
  /** Reset captcha widget (e.g. on AUTH.CAPTCHA_NEEDED). */
  resetCaptcha: () => void;
  /** Telemetry side-effects (event tracking, Sentry). Pluggable so tests
      stay clean and so we don't hard-couple to gtag/Sentry SDKs in here. */
  track: (event: TelemetryEvent) => void;
  reportError: (err: SentryReport) => void;
  /** Called on success — caller decides redirect target. */
  onSuccess: () => void;
}

export interface TelemetryEvent {
  category: string;
  action: string;
  label?: string;
}

export interface SentryReport {
  error: Error;
  type: string;
  status: number | null;
  errorMessage: string;
}

const extractStatus = (data: unknown): number | null => {
  if (!data || typeof data !== 'object') return null;
  const r = data as { status?: unknown; errorData?: unknown };
  if (typeof r.status === 'number') return r.status;
  const errData = r.errorData as { statusCode?: unknown } | null | undefined;
  if (errData && typeof errData.statusCode === 'number') return errData.statusCode;
  return null;
};

const extractErrorMessage = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const errData = (data as { errorData?: unknown }).errorData;
  if (errData && typeof errData === 'object' && 'message' in errData) {
    const m = (errData as { message?: unknown }).message;
    return typeof m === 'string' ? m : null;
  }
  return null;
};

const extractCode = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
};

// ─── login submit ────────────────────────────────────────────────────────

export async function performLoginSubmit(deps: SubmitDeps): Promise<void> {
  const { state, dispatch, obtainCaptcha, resetCaptcha, track, reportError, onSuccess } =
    deps;

  // Pre-submit validation — surface every missing field at once.
  if (!state.isEmailValid || !state.isPasswordValid) {
    if (!state.email) {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.EMPTY' });
    } else if (!validateEmail(state.email)) {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
    }
    if (!state.password) {
      dispatch({ type: 'SET_PASSWORD_ERROR', error: 'AUTHORIZATION.PASSWORD.EMPTY' });
    } else if (!validatePasswordOk(state.password)) {
      // SET_PASSWORD already emitted the right message during typing.
    }
    return;
  }

  let captcha = state.captcha;
  if (!captcha && state.recaptureShown) {
    try {
      captcha = await obtainCaptcha();
    } catch {
      dispatch({ type: 'SET_CAPTURE_NOT_COMPLETE' });
      return;
    }
  }

  dispatch({ type: 'SET_FETCHING', value: true });

  const result = await signin({
    email: normalizeEmail(state.email),
    password: state.password,
    captcha: captcha || undefined,
    code: state.verificationCode || undefined,
    utmData: { ...getUtms() },
    landingPage: getLandingPage(),
    linkOauth: state.isLinkOauth && state.isLinkOauthAccountChecked,
  });

  dispatch({ type: 'SET_FETCHING', value: false });

  // Network failure → Connection error form.
  if (result.isError) {
    const errorData = (result.data as { errorData?: unknown }).errorData;
    const status = extractStatus(result.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.SOMETHING_WRONG,
        label: `status: ${status}`,
      });
      reportError({
        error: new Error('Connection error'),
        type: SENTRY_ERRORS_TYPES.LOGIN_ERROR,
        status,
        errorMessage: 'Connection error',
      });
      return;
    }

    const message = extractErrorMessage(result.data);
    const code = extractCode(result.data);

    // Captcha challenge: show widget, request fresh token, do NOT auto-submit.
    if (message === AUTH_ERRORS.CAPTCHA_NEEDED) {
      dispatch({ type: 'SHOW_RECAPTURE' });
      resetCaptcha();
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.CAPTCHA_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    // New device → email-code prompt.
    if (message === AUTH_ERRORS.CODE_NEEDED) {
      dispatch({ type: 'SET_CONFIRM_DEVICE', value: true });
      dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.EMAIL_CODE_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    // 2FA: legacy returns either errorMessage or top-level `code` — handle both.
    if (
      message === AUTH_ERRORS.FA_CODE_NEEDED ||
      code === AUTH_ERRORS.FA_CODE_NEEDED
    ) {
      dispatch({ type: 'RESET_CAPTCHA' });
      dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
      return;
    }

    if (message === AUTH_ERRORS.INVALID_CODE) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.INVALID_CODE',
      });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.TWO_FACTOR_INVALID_CODE,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    // Unified entry-form: INVALID_CREDENTIALS doesn't necessarily mean
    // "wrong password" — it could also mean "no such account". The backend
    // collapses both for enumeration safety, so we flip the form into
    // "suggest signup" mode and let the user confirm before we register
    // them. The legacy LoginForm (`?form=login` deep-link, embedded modal)
    // keeps the previous "ACCOUNT_NOT_FOUND" inline error.
    if (
      message === AUTH_ERRORS.INVALID_CREDENTIALS &&
      state.currentForm === 'entry' &&
      state.entryMode === 'fresh'
    ) {
      dispatch({ type: 'SET_ENTRY_MODE', mode: 'suggest-signup' });
      dispatch({ type: 'CLEAR_PASSWORD_ERROR' });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.INVALID_CREDENTIALS,
        label: `status: ${status}, error: ${message} (suggest-signup)`,
      });
      return;
    }

    // Fall through to the error mapper. Anything we know goes to the right
    // field; unknown messages bubble up as a generic SERVER_ERROR + Sentry.
    const mapped = mapAuthError('login', message);
    if (mapped.field === 'password') {
      dispatch({ type: 'SET_PASSWORD_ERROR', error: mapped.i18nKey });
    } else if (mapped.field === 'email') {
      dispatch({ type: 'SET_EMAIL_ERROR', error: mapped.i18nKey });
    } else {
      dispatch({ type: 'SET_OAUTH_ERROR', error: mapped.i18nKey });
    }
    if (mapped.unknown) {
      reportError({
        error: new Error(message ?? 'unknown'),
        type: SENTRY_ERRORS_TYPES.LOGIN_ERROR,
        status,
        errorMessage: message ?? 'unknown',
      });
    }
    return;
  }

  // 2xx response. `/v2.0/auth/signin/web` returns 200 + `{ code: '2FA_CODE_NEEDED' }`
  // (plus a first-step access cookie) when the account has 2FA enabled, and
  // 204 + full cookies on outright success. We must check the body BEFORE
  // signalling success — otherwise a 2FA user gets redirected to /pro/balance
  // with a half-authenticated cookie that fails every subsequent request.
  if (extractCode(result.data) === AUTH_ERRORS.FA_CODE_NEEDED) {
    dispatch({ type: 'RESET_CAPTCHA' });
    dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
    return;
  }
  // Empty 200/204 ⇒ legitimate success (E19 — not a connection error like
  // legacy briefly read it). Telemetry + redirect.
  track({ category: 'login', action: 'login' });
  clearResendBuckets('login-confirm', 'signup-confirm', 'register-confirm');
  onSuccess();
}

// ─── register submit ─────────────────────────────────────────────────────

export async function performRegisterSubmit(deps: SubmitDeps): Promise<void> {
  const { state, dispatch, obtainCaptcha, resetCaptcha, track, reportError, onSuccess } =
    deps;

  // Validate ALL fields — show every missing one at once, like legacy.
  let invalid = false;
  if (!state.email) {
    dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.EMPTY' });
    invalid = true;
  } else if (!state.isEmailValid) {
    dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
    invalid = true;
  }
  const passwordError = validatePassword(state.password);
  if (passwordError) {
    invalid = true;
  }
  const repeatedError = validatePasswordsMatch(state.password, state.repeatedPassword);
  if (repeatedError) {
    invalid = true;
  }
  if (!state.isAgreementChecked) {
    dispatch({ type: 'SET_AGREEMENT_ERROR', error: true });
    invalid = true;
  }

  if (invalid) return;

  let captcha = state.captcha;
  if (!captcha && state.recaptureShown) {
    try {
      captcha = await obtainCaptcha();
    } catch {
      dispatch({ type: 'SET_CAPTURE_NOT_COMPLETE' });
      return;
    }
  }

  dispatch({ type: 'SET_FETCHING', value: true });

  const result = await signup({
    email: normalizeEmail(state.email),
    password: state.password,
    subscribeToNewsletter: state.isSubscribeToNewsletterChecked,
    captcha: captcha || undefined,
    utmData: { ...getUtms() },
    landingPage: getLandingPage(),
  });

  dispatch({ type: 'SET_FETCHING', value: false });

  if (result.isError) {
    const errorData = (result.data as { errorData?: unknown }).errorData;
    const status = extractStatus(result.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_UP.SOMETHING_WRONG,
        label: `status: ${status}`,
      });
      reportError({
        error: new Error('Connection error'),
        type: SENTRY_ERRORS_TYPES.REGISTER_ERROR,
        status,
        errorMessage: 'Connection error',
      });
      return;
    }

    const message = extractErrorMessage(result.data);

    if (message === AUTH_ERRORS.CAPTCHA_NEEDED) {
      dispatch({ type: 'SHOW_RECAPTURE' });
      resetCaptcha();
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_UP.CAPTCHA_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    if (message === AUTH_ERRORS.CODE_NEEDED) {
      dispatch({ type: 'SET_CONFIRM_DEVICE', value: true });
      dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.SIGN_IN.EMAIL_CODE_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    const mapped = mapAuthError('register', message);
    if (mapped.field === 'email') {
      dispatch({ type: 'SET_EMAIL_ERROR', error: mapped.i18nKey });
    } else {
      dispatch({ type: 'SET_OAUTH_ERROR', error: mapped.i18nKey });
    }
    if (mapped.unknown) {
      reportError({
        error: new Error(message ?? 'unknown'),
        type: SENTRY_ERRORS_TYPES.REGISTER_ERROR,
        status,
        errorMessage: message ?? 'unknown',
      });
    }
    track({
      category: 'error',
      action: AUTHORIZATION_ERRORS.SIGN_UP.SOMETHING_ERROR,
      label: `status: ${status}, error: ${message}`,
    });
    return;
  }

  // Success path. Legacy expected the server to ALWAYS respond with
  // CODE_NEEDED on signup (kicking the user into device-confirm). We surface
  // an explicit "check email" success state in case the server returns a
  // bare 200/204 — fixes edge case E2.
  track({ category: 'user-engagement', action: 'reg-success' });
  dispatch({ type: 'SET_FORM', form: 'register-success', remember: true });
  dispatch({ type: 'SET_TIMER', seconds: 60 });
  onSuccess();
}

// ─── entry signup submit ─────────────────────────────────────────────────
//
// Variant of `performRegisterSubmit` that fires from the unified entry form
// (one password field, no repeated input). Triggered only after a signin
// probe returned INVALID_CREDENTIALS and the user confirmed "Create
// account". On EMAIL_ALREADY_EXIST the backend has changed its mind (rare
// race) — drop back to fresh-entry with a password error so the user can
// re-try as a returning customer instead of being silently stuck.

export async function performEntrySignup(deps: SubmitDeps): Promise<void> {
  const { state, dispatch, obtainCaptcha, resetCaptcha, track, reportError, onSuccess } =
    deps;

  let invalid = false;
  if (!state.email) {
    dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.EMPTY' });
    invalid = true;
  } else if (!state.isEmailValid) {
    dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
    invalid = true;
  }
  const passwordError = validatePassword(state.password);
  if (passwordError) {
    invalid = true;
  }
  if (!state.isAgreementChecked) {
    dispatch({ type: 'SET_AGREEMENT_ERROR', error: true });
    invalid = true;
  }
  if (invalid) return;

  let captcha = state.captcha;
  if (!captcha && state.recaptureShown) {
    try {
      captcha = await obtainCaptcha();
    } catch {
      dispatch({ type: 'SET_CAPTURE_NOT_COMPLETE' });
      return;
    }
  }

  dispatch({ type: 'SET_FETCHING', value: true });
  const result = await signup({
    email: normalizeEmail(state.email),
    password: state.password,
    subscribeToNewsletter: state.isSubscribeToNewsletterChecked,
    captcha: captcha || undefined,
    utmData: { ...getUtms() },
    landingPage: getLandingPage(),
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (result.isError) {
    const errorData = (result.data as { errorData?: unknown }).errorData;
    const status = extractStatus(result.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      reportError({
        error: new Error('Connection error'),
        type: SENTRY_ERRORS_TYPES.REGISTER_ERROR,
        status,
        errorMessage: 'Connection error',
      });
      return;
    }
    const message = extractErrorMessage(result.data);

    if (message === AUTH_ERRORS.CAPTCHA_NEEDED) {
      dispatch({ type: 'SHOW_RECAPTURE' });
      resetCaptcha();
      return;
    }
    if (message === AUTH_ERRORS.CODE_NEEDED) {
      dispatch({ type: 'SET_CONFIRM_DEVICE', value: true });
      dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
      return;
    }
    // Race: signin said "no account", but signup now reports the email is
    // taken. Flip back to fresh entry and surface the typo-friendly error.
    if (
      message === 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST' ||
      message === 'AUTH.EMAIL.EMAIL_ALREADY_EXIST'
    ) {
      dispatch({ type: 'SET_ENTRY_MODE', mode: 'fresh' });
      dispatch({
        type: 'SET_PASSWORD_ERROR',
        error: 'AUTHORIZATION.ACCOUNT_NOT_FOUND',
      });
      return;
    }

    const mapped = mapAuthError('register', message);
    if (mapped.field === 'email') {
      dispatch({ type: 'SET_EMAIL_ERROR', error: mapped.i18nKey });
    } else {
      dispatch({ type: 'SET_OAUTH_ERROR', error: mapped.i18nKey });
    }
    if (mapped.unknown) {
      reportError({
        error: new Error(message ?? 'unknown'),
        type: SENTRY_ERRORS_TYPES.REGISTER_ERROR,
        status,
        errorMessage: message ?? 'unknown',
      });
    }
    track({
      category: 'error',
      action: AUTHORIZATION_ERRORS.SIGN_UP.SOMETHING_ERROR,
      label: `status: ${status}, error: ${message}`,
    });
    return;
  }

  track({ category: 'user-engagement', action: 'reg-success' });
  dispatch({ type: 'SET_FORM', form: 'register-success', remember: true });
  dispatch({ type: 'SET_TIMER', seconds: 60 });
  onSuccess();
}

// ─── forgot-password submit ──────────────────────────────────────────────

interface ForgotSubmitDeps extends Omit<SubmitDeps, 'onSuccess'> {
  /** Called when the email was accepted — caller switches to forgot-success. */
  onSuccess: () => void;
}

export async function performForgotPasswordSubmit(deps: ForgotSubmitDeps): Promise<void> {
  const { state, dispatch, obtainCaptcha, resetCaptcha, track, reportError, onSuccess } =
    deps;

  if (!state.isEmailValid) {
    if (!state.email) {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.EMPTY' });
    } else {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
    }
    return;
  }

  let captcha = state.captcha;
  if (!captcha && state.recaptureShown) {
    try {
      captcha = await obtainCaptcha();
    } catch {
      dispatch({ type: 'SET_CAPTURE_NOT_COMPLETE' });
      return;
    }
  }

  dispatch({ type: 'SET_FETCHING', value: true });
  const result = await forgotPassword({
    email: normalizeEmail(state.email),
    captcha: captcha || undefined,
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (result.isError) {
    const errorData = (result.data as { errorData?: unknown }).errorData;
    const status = extractStatus(result.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      reportError({
        error: new Error('Connection error'),
        type: SENTRY_ERRORS_TYPES.FORGOT_PASSWORD_ERROR,
        status,
        errorMessage: 'Connection error',
      });
      return;
    }
    const message = extractErrorMessage(result.data);

    if (message === AUTH_ERRORS.CAPTCHA_NEEDED) {
      dispatch({ type: 'SHOW_RECAPTURE' });
      resetCaptcha();
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.FORGOT_PASSWORD.CAPTCHA_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }
    if (message === AUTH_ERRORS.BAD_REQUEST) {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.FORGOT_PASSWORD.BAD_REQUEST,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }
    if (message === AUTH_ERRORS.FORGOTTEN_PASSWORD_RETRY_LATER) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.FORGOT_PASSWORD.RETRY_LATER,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }

    // Unknown error — generic toast + Sentry.
    dispatch({ type: 'SET_OAUTH_ERROR', error: 'AUTHORIZATION.SERVER_ERROR' });
    reportError({
      error: new Error(message ?? 'unknown'),
      type: SENTRY_ERRORS_TYPES.FORGOT_PASSWORD_ERROR,
      status,
      errorMessage: message ?? 'unknown',
    });
    return;
  }

  // Success: switch to forgot-success view + start 60s resend timer.
  dispatch({ type: 'SET_FORM', form: 'forgot-password-success', remember: true });
  dispatch({ type: 'SET_TIMER', seconds: DEFAULT_TIMER_NUMBER });
  onSuccess();
}

// ─── reset-password submit ───────────────────────────────────────────────

interface ResetSubmitDeps extends Omit<SubmitDeps, 'onSuccess'> {
  /** Called once the password is updated — caller shows success view. */
  onSuccess: () => void;
}

export async function performResetPasswordSubmit(deps: ResetSubmitDeps): Promise<void> {
  const { state, dispatch, track, reportError, onSuccess } = deps;

  if (!state.isPasswordValid || !state.isRepeatedPasswordValid) {
    // Inline validation messages already surfaced by SET_PASSWORD /
    // SET_REPEATED_PASSWORD reducers; no need to re-emit.
    return;
  }
  if (!state.resetToken) {
    // E21 fix: refuse to submit without a token (legacy sent `String(null)`).
    dispatch({ type: 'SET_FORM', form: 'reset-password-link-not-found', remember: true });
    return;
  }

  dispatch({ type: 'SET_FETCHING', value: true });
  const result = await resetPassword({
    password: state.password,
    token: state.resetToken,
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (result.isError) {
    const status = extractStatus(result.data);
    const errorData = (result.data as { errorData?: unknown }).errorData;
    if (status === 400) {
      dispatch({ type: 'SET_FORM', form: 'reset-password-link-not-found', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.RESET_PASSWORD.LINK_NOT_FOUND,
        label: `status: ${status}`,
      });
      return;
    }
    if (errorData === null || status === 429) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.RESET_PASSWORD.TOO_MANY_REQUESTS_OR_NULL,
        label: `status: ${status}`,
      });
      reportError({
        error: new Error('Reset password failed'),
        type: SENTRY_ERRORS_TYPES.RESET_PASSWORD_ERROR,
        status,
        errorMessage: 'Reset password failed',
      });
      return;
    }
    // Unknown — fallback connection-error.
    dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
    return;
  }

  dispatch({ type: 'SET_FORM', form: 'reset-password-success', remember: true });
  onSuccess();
}

// ─── 2FA submit (security-verification) ──────────────────────────────────

interface AuthenticateDeps extends SubmitDeps {
  /** True when this is the device-confirm (email-code) variant. The code
      shape is the same, but routing is different — see legacy
      handleSecurityVerificationSubmit (authorization.jsx:1458-1484). */
  isConfirmDevice: boolean;
  /** Saved Google JWT — for the OAuth-2FA branch. */
  googleJwtToken: string | null;
}

export async function performAuthenticateSubmit(deps: AuthenticateDeps): Promise<void> {
  const { state, dispatch, track, reportError, onSuccess, isConfirmDevice, googleJwtToken } =
    deps;

  if (!state.isVerificationCodeValid) {
    if (!state.verificationCode) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.GOOGLE_AUTHENTICATION.MIN_CHARACTERS',
      });
      return;
    }
    dispatch({
      type: 'SET_VERIFICATION_CODE_ERROR',
      error: 'AUTHORIZATION.INVALID_CODE',
    });
    return;
  }

  // Device-confirm + Google JWT → second leg of OAuth.
  if (isConfirmDevice && googleJwtToken && !state.isLinkOauth) {
    dispatch({ type: 'SET_FETCHING', value: true });
    const r = await googleOauth({
      googleIdToken: googleJwtToken,
      code: state.verificationCode,
    });
    dispatch({ type: 'SET_FETCHING', value: false });
    if (r.isError) {
      const message = extractErrorMessage(r.data);
      const status = extractStatus(r.data);
      if (message === AUTH_ERRORS.INVALID_CODE) {
        dispatch({
          type: 'SET_VERIFICATION_CODE_ERROR',
          error: 'AUTHORIZATION.INVALID_CODE',
        });
        track({
          category: 'error',
          action: AUTHORIZATION_ERRORS.SIGN_IN.TWO_FACTOR_INVALID_CODE,
          label: `status: ${status}, error: ${message}`,
        });
        return;
      }
      const errorData = (r.data as { errorData?: unknown }).errorData;
      if (errorData === null) {
        dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
        reportError({
          error: new Error('Connection error'),
          type: SENTRY_ERRORS_TYPES.LOGIN_ERROR,
          status,
          errorMessage: 'Connection error',
        });
        return;
      }
      // Unknown — connection-error rather than silent success (E5 fix).
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      reportError({
        error: new Error(message ?? 'unknown'),
        type: SENTRY_ERRORS_TYPES.LOGIN_ERROR,
        status,
        errorMessage: message ?? 'unknown',
      });
      return;
    }
    track({ category: 'login', action: 'login' });
    clearResendBuckets('login-confirm', 'signup-confirm', 'register-confirm');
    onSuccess();
    return;
  }

  // Device-confirm without Google JWT → re-fire login with the email code
  // attached. This matches legacy handleLogInSubmit being called from
  // handleSecurityVerificationSubmit when isConfirmDevice is true.
  if (isConfirmDevice) {
    dispatch({ type: 'SET_FETCHING', value: true });
    const r = await signin({
      email: normalizeEmail(state.email),
      password: state.password,
      captcha: state.captcha || undefined,
      code: state.verificationCode,
      utmData: { ...getUtms() },
      landingPage: getLandingPage(),
      linkOauth: state.isLinkOauth && state.isLinkOauthAccountChecked,
    });
    dispatch({ type: 'SET_FETCHING', value: false });
    if (r.isError) {
      const message = extractErrorMessage(r.data);
      const status = extractStatus(r.data);
      if (message === AUTH_ERRORS.INVALID_CODE) {
        dispatch({
          type: 'SET_VERIFICATION_CODE_ERROR',
          error: 'AUTHORIZATION.INVALID_CODE',
        });
        track({
          category: 'error',
          action: AUTHORIZATION_ERRORS.SIGN_IN.TWO_FACTOR_INVALID_CODE,
          label: `status: ${status}, error: ${message}`,
        });
        return;
      }
      // Anything else → connection-error.
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      reportError({
        error: new Error(message ?? 'unknown'),
        type: SENTRY_ERRORS_TYPES.LOGIN_ERROR,
        status,
        errorMessage: message ?? 'unknown',
      });
      return;
    }
    track({ category: 'login', action: 'login' });
    clearResendBuckets('login-confirm', 'signup-confirm', 'register-confirm');
    onSuccess();
    return;
  }

  // Pure 2FA-code (existing user with TOTP enabled) — POST /2fa/authenticate.
  dispatch({ type: 'SET_FETCHING', value: true });
  const r = await twoFaAuthenticate({
    code: state.verificationCode,
    linkOauth: state.isLinkOauth && state.isLinkOauthAccountChecked,
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (r.isError) {
    const status = extractStatus(r.data);
    const message = extractErrorMessage(r.data);
    if (status === 429) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.TOO_MANY_REQUESTS',
      });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.AUTHENTICATE.TOO_MANY_REQUESTS,
        label: `status: ${status}`,
      });
      return;
    }
    if (status === 400 || status === 404) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.INVALID_CODE',
      });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.AUTHENTICATE.TWO_FACTOR_INVALID_CODE,
        label: `status: ${status}`,
      });
      return;
    }
    dispatch({
      type: 'SET_VERIFICATION_CODE_ERROR',
      error: 'AUTHORIZATION.SERVER_ERROR',
    });
    track({
      category: 'error',
      action: AUTHORIZATION_ERRORS.AUTHENTICATE.SOMETHING_WRONG,
      label: `status: ${status}, error: ${message}`,
    });
    reportError({
      error: new Error(message ?? 'authenticate failed'),
      type: SENTRY_ERRORS_TYPES.AUTHENTICATE_ERROR,
      status,
      errorMessage: message ?? 'authenticate failed',
    });
    return;
  }

  track({ category: 'login', action: 'login' });
  clearResendBuckets('login-confirm', 'signup-confirm', 'register-confirm');
  onSuccess();
}

// ─── set-up-login submit ─────────────────────────────────────────────────

interface SetUpLoginDeps extends Omit<SubmitDeps, 'onSuccess'> {
  /** True after we've already submitted email+password and received CODE_NEEDED;
      we're now collecting the email-code from the user. */
  isEmailCodeStep: boolean;
  /** From `cn_csrf` cookie — caller reads via document.cookie. */
  csrfToken?: string;
  onSuccess: () => void;
  onCodeStepRequired: () => void;
}

const cookieValue = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1] ?? '') : undefined;
};

export async function performSetUpLoginSubmit(deps: SetUpLoginDeps): Promise<void> {
  const { state, dispatch, track, reportError, onSuccess, onCodeStepRequired, isEmailCodeStep } =
    deps;
  const csrfToken = deps.csrfToken ?? cookieValue('cn_csrf');

  if (!isEmailCodeStep) {
    if (!state.isEmailValid || !state.isPasswordValid || !state.isRepeatedPasswordValid) {
      // Field-level errors already surfaced via the input handlers.
      return;
    }
    dispatch({ type: 'SET_FETCHING', value: true });
    const r = await setUpLogin({
      email: state.email,
      password: state.password,
      csrfToken,
    });
    dispatch({ type: 'SET_FETCHING', value: false });

    // `/v2.0/users/set-up-login/web` indicates "email code required" with
    // HTTP 202 + body `{ message: USERS.SETUP_LOGIN_EMAIL_CODE_NEEDED,
    // statusCode: 202 }`. 202 is a 2xx so the DAL treats it as success and
    // gives us the parsed body in `r.data` (not in an error envelope). We
    // must branch on the body BEFORE calling onSuccess() — otherwise wallet-
    // /OAuth-only users get sent to /pro/balance instead of the OTP form.
    if (!r.isError) {
      const body = (r.data ?? {}) as { message?: string; statusCode?: number };
      if (body.message === USERS_ERRORS.CODE_NEEDED || r.status === 202) {
        dispatch({ type: 'SET_EMAIL_CODE_STEP', value: true });
        dispatch({ type: 'SET_CONFIRM_DEVICE', value: true });
        dispatch({ type: 'SET_FORM', form: 'security-verification', remember: true });
        onCodeStepRequired();
        return;
      }
      onSuccess();
      return;
    }

    const errorData = (r.data as { errorData?: unknown }).errorData;
    const status = extractStatus(r.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      return;
    }
    const message =
      ((r.data as { errorData?: { message?: string } }).errorData?.message) ??
      ((r.data as { message?: string }).message);

    if (message === USERS_ERRORS.INVALID_EMAIL) {
      dispatch({ type: 'SET_EMAIL_ERROR', error: 'AUTHORIZATION.EMAIL.INVALID_EMAIL' });
      return;
    }
    if (message === USERS_ERRORS.EMAIL_ALREADY_EXISTS) {
      dispatch({
        type: 'SET_EMAIL_ERROR',
        error: 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST_SET_UP',
      });
      return;
    }
    reportError({
      error: new Error(message ?? 'set-up-login failed'),
      type: SENTRY_ERRORS_TYPES.SET_UP_LOGIN_ERROR,
      status,
      errorMessage: message ?? 'unknown',
    });
    track({
      category: 'error',
      action: 'AUTHORIZATION.SET_UP_LOGIN.SOMETHING_WRONG',
      label: `status: ${status}, error: ${message}`,
    });
    return;
  }

  // step 2: user entered the email-code, re-fire set-up-login with `emailCode`.
  dispatch({ type: 'SET_FETCHING', value: true });
  const r = await setUpLogin({
    email: state.email,
    password: state.password,
    emailCode: state.verificationCode,
    csrfToken,
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (r.isError) {
    const message =
      (r.data as { errorData?: { message?: string } }).errorData?.message ??
      (r.data as { message?: string }).message;
    if (message === USERS_ERRORS.INVALID_CODE) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.INVALID_CODE',
      });
      return;
    }
    if (message === USERS_ERRORS.EMAIL_ALREADY_EXISTS) {
      dispatch({
        type: 'SET_EMAIL_ERROR',
        error: 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST',
      });
      dispatch({ type: 'SET_FORM', form: 'set-up-login', remember: true });
      return;
    }
    dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
    return;
  }

  dispatch({ type: 'SET_EMAIL_CODE_STEP', value: false });
  onSuccess();
}

// ─── change-password submit ──────────────────────────────────────────────

interface ChangePasswordDeps extends Omit<SubmitDeps, 'onSuccess'> {
  /** Optional 2FA code — supplied after 2FA confirmation step. */
  code?: string;
  /** Caller-side flag: user has 2FA enabled, so direct change-password
      submit jumps to security-verification first. */
  isTwoFactorEnabled: boolean;
  onSuccess: () => void;
  onTwoFactorRequired: () => void;
}

export async function performChangePasswordSubmit(deps: ChangePasswordDeps): Promise<void> {
  const {
    state,
    dispatch,
    obtainCaptcha,
    resetCaptcha,
    track,
    reportError,
    onSuccess,
    onTwoFactorRequired,
    isTwoFactorEnabled,
    code,
  } = deps;

  if (
    !state.isOldPasswordValid ||
    !state.isPasswordValid ||
    !state.isRepeatedPasswordValid
  ) {
    return;
  }

  // Without 2FA we go directly to changePassword; with 2FA we first ask
  // the user for their TOTP via security-verification, then re-fire this
  // handler with `code` set.
  if (isTwoFactorEnabled && !code) {
    onTwoFactorRequired();
    return;
  }

  let captcha = state.captcha;
  if (!captcha && state.recaptureShown) {
    try {
      captcha = await obtainCaptcha();
    } catch {
      dispatch({ type: 'SET_CAPTURE_NOT_COMPLETE' });
      return;
    }
  }

  dispatch({ type: 'SET_FETCHING', value: true });
  const r = await changePasswordDal({
    password: state.password,
    oldPassword: state.oldPassword,
    code,
    captcha: captcha || undefined,
    // `/v2.0/users/password/web` is CsrfGuard-protected — header MUST equal
    // the cn_csrf cookie value or backend returns 403 before validating.
    csrfToken: cookieValue('cn_csrf'),
  });
  dispatch({ type: 'SET_FETCHING', value: false });

  if (r.isError) {
    const errorData = (r.data as { errorData?: unknown }).errorData;
    const status = extractStatus(r.data);
    if (errorData === null) {
      dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
      reportError({
        error: new Error('Connection error'),
        type: SENTRY_ERRORS_TYPES.CHANGE_PASSWORD_ERROR,
        status,
        errorMessage: 'Connection error',
      });
      return;
    }
    const message = (r.data as { errorData?: { message?: unknown } }).errorData?.message;

    if (message === CHANGE_PASSWORD_ERRORS.PASSWORD_NOT_UPDATED) {
      dispatch({
        type: 'SET_OLD_PASSWORD_ERROR',
        error: 'AUTHORIZATION.PASSWORD.INCORRECT',
      });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.CHANGE_PASSWORD.NOT_UPDATED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }
    if (message === AUTH_ERRORS.CAPTCHA_NEEDED) {
      dispatch({ type: 'SHOW_RECAPTURE' });
      resetCaptcha();
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.CHANGE_PASSWORD.CAPTCHA_NEEDED,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }
    if (
      message === 'TWO_FACTOR.INVALID_CODE' ||
      isTwoFactorCodeArrayError(message)
    ) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.INVALID_CODE',
      });
      track({
        category: 'error',
        action: AUTHORIZATION_ERRORS.CHANGE_PASSWORD.TWO_FACTOR_INVALID_CODE,
        label: `status: ${status}, error: ${message}`,
      });
      return;
    }
    if (status === 400) {
      dispatch({
        type: 'SET_VERIFICATION_CODE_ERROR',
        error: 'AUTHORIZATION.INVALID_CODE',
      });
      return;
    }
    dispatch({ type: 'SET_FORM', form: 'connection-error', remember: true });
    reportError({
      error: new Error(typeof message === 'string' ? message : 'change-password failed'),
      type: SENTRY_ERRORS_TYPES.CHANGE_PASSWORD_ERROR,
      status,
      errorMessage: typeof message === 'string' ? message : 'unknown',
    });
    return;
  }

  dispatch({ type: 'SET_FORM', form: 'change-password-success', remember: true });
  onSuccess();
}
