// State machine for the auth orchestrator. The legacy oracle
// (`legacy-projects/.../components/authorization/authorization.jsx`) used
// 25+ React useState hooks against a Redux slice. We collapse to a single
// reducer because:
//   - The fields are tightly coupled (changing email clears email errors,
//     change password updates repeated-password validity, etc.).
//   - Redux is overkill for a self-contained client tree.
//   - A reducer makes every transition auditable and trivial to test.
//
// Form names match legacy form-names.js verbatim. The 22 sub-forms are not
// all wired in iteration 2 — fields/transitions for forgot/reset/2FA/social
// land in later iterations and append to the same reducer.

import type { Dispatch } from 'react';

import type { PasswordError, RepeatedPasswordError, VerificationCodeError } from '@/lib/auth/validation';

export type FormName =
  | 'login'
  | 'register'
  | 'register-success'
  | 'forgot-password'
  | 'forgot-password-success'
  | 'reset-password'
  | 'reset-password-success'
  | 'reset-password-link-not-found'
  | 'change-password'
  | 'change-password-success'
  | 'email-confirmed'
  | 'link-expired'
  | 'security-verification'
  | 'connection-error'
  | 'metamask-login'
  | 'metamask-register'
  | 'set-up-login'
  | 'set-up-wallet'
  | 'set-up-metamask'
  | 'set-up-walletconnect';

export interface AuthFormState {
  currentForm: FormName;
  prevForm: FormName | null;

  email: string;
  emailError: string | null;
  isEmailValid: boolean;

  password: string;
  passwordError: string | null;
  isPasswordValid: boolean;

  repeatedPassword: string;
  repeatedPasswordError: string | null;
  isRepeatedPasswordValid: boolean;

  oldPassword: string;
  oldPasswordError: string | null;
  isOldPasswordValid: boolean;

  verificationCode: string;
  verificationCodeError: string | null;
  isVerificationCodeValid: boolean;

  isAgreementChecked: boolean;
  isAgreementError: boolean;
  isSubscribeToNewsletterChecked: boolean;
  isLinkOauthAccountChecked: boolean;

  isPasswordTextShown: boolean;

  /** Backend asked for a CAPTCHA — show the (invisible) Turnstile widget. */
  recaptureShown: boolean;
  /** Token resolved from Turnstile (or empty when sitekey missing). */
  captcha: string;
  /** True when a submit happened without a captcha token but Turnstile expected one. */
  isCaptureNotCompleteError: boolean;

  /** Server told us to confirm the device via email-code. */
  isConfirmDevice: boolean;
  /** Set-up-login flow has progressed to "enter email-code" step. */
  isEmailCodeStep: boolean;
  /** Linking the existing email account with an OAuth provider. */
  isLinkOauth: boolean;
  /** OAuth-specific banner-level error (legacy `oAuthError`). */
  oAuthError: string | null;
  /** JWT from Google we'll re-send with the 2FA code. */
  googleJwtToken: string | null;
  isGoogleAuthLoading: boolean;

  /** UI-only: countdown for resend buttons (60s base flow). */
  timerNumber: number | null;

  /** True while a network call is in flight. */
  isFetching: boolean;

  /** `?resetToken=` query — required by PUT /v1.1/auth/reset-password. */
  resetToken: string | null;
}

export type AuthFormAction =
  | { type: 'SET_FORM'; form: FormName; remember?: boolean }
  | { type: 'SET_EMAIL'; value: string; isValid: boolean }
  | { type: 'CLEAR_EMAIL_ERROR' }
  | { type: 'SET_EMAIL_ERROR'; error: string }
  | { type: 'SET_PASSWORD'; value: string; passwordError: PasswordError; matchesRepeated: boolean }
  | { type: 'CLEAR_PASSWORD_ERROR' }
  | { type: 'SET_PASSWORD_ERROR'; error: string }
  | {
      type: 'SET_REPEATED_PASSWORD';
      value: string;
      error: RepeatedPasswordError;
    }
  | { type: 'CLEAR_REPEATED_PASSWORD_ERROR' }
  | { type: 'SET_OLD_PASSWORD'; value: string; passwordError: PasswordError }
  | { type: 'CLEAR_OLD_PASSWORD_ERROR' }
  | { type: 'SET_OLD_PASSWORD_ERROR'; error: string }
  | { type: 'SET_VERIFICATION_CODE'; value: string; error: VerificationCodeError }
  | { type: 'CLEAR_VERIFICATION_CODE_ERROR' }
  | { type: 'SET_VERIFICATION_CODE_ERROR'; error: string }
  | { type: 'TOGGLE_AGREEMENT' }
  | { type: 'SET_AGREEMENT_ERROR'; error: boolean }
  | { type: 'TOGGLE_NEWSLETTER' }
  | { type: 'TOGGLE_LINK_OAUTH' }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'SHOW_RECAPTURE' }
  | { type: 'SET_CAPTCHA'; token: string }
  | { type: 'RESET_CAPTCHA' }
  | { type: 'SET_CAPTURE_NOT_COMPLETE' }
  | { type: 'SET_CONFIRM_DEVICE'; value: boolean }
  | { type: 'SET_EMAIL_CODE_STEP'; value: boolean }
  | { type: 'SET_LINK_OAUTH'; value: boolean }
  | { type: 'SET_OAUTH_ERROR'; error: string | null }
  | { type: 'SET_GOOGLE_JWT'; token: string | null }
  | { type: 'SET_GOOGLE_LOADING'; value: boolean }
  | { type: 'TICK_TIMER' }
  | { type: 'SET_TIMER'; seconds: number | null }
  | { type: 'SET_FETCHING'; value: boolean }
  | { type: 'CLEAR_PASSWORDS' }
  | { type: 'CLEAR_FORM' };

export type AuthDispatch = Dispatch<AuthFormAction>;

const passwordErrorToText = (err: PasswordError): string | null => {
  switch (err) {
    case 'EMPTY':
      return 'AUTHORIZATION.PASSWORD.EMPTY';
    case 'CONTAINS_SPACES':
      return 'AUTHORIZATION.PASSWORD.INCORRECT';
    case 'TOO_SHORT':
      return 'AUTHORIZATION.PASSWORD.MIN_CHARACTERS';
    case 'TOO_LONG':
      return 'AUTHORIZATION.PASSWORD.MAX_CHARACTERS';
    default:
      return null;
  }
};

const repeatedErrorToText = (err: RepeatedPasswordError): string | null => {
  switch (err) {
    case 'EMPTY':
      return 'AUTHORIZATION.PASSWORD.EMPTY';
    case 'NOT_MATCH':
      return 'AUTHORIZATION.PASSWORD.NOT_MATCH';
    default:
      return null;
  }
};

const codeErrorToText = (err: VerificationCodeError): string | null => {
  switch (err) {
    case 'EMPTY':
      return null; // legacy doesn't show on empty mid-typing
    case 'CONTAINS_SPACES':
      return 'AUTHORIZATION.GOOGLE_AUTHENTICATION.CODE_WITH_SPACES';
    case 'TOO_SHORT':
      return 'AUTHORIZATION.GOOGLE_AUTHENTICATION.MIN_CHARACTERS';
    case 'INVALID_FORMAT':
      return 'AUTHORIZATION.INVALID_CODE';
    default:
      return null;
  }
};

export const initialState: AuthFormState = {
  currentForm: 'login',
  prevForm: null,

  email: '',
  emailError: null,
  isEmailValid: false,

  password: '',
  passwordError: null,
  isPasswordValid: false,

  repeatedPassword: '',
  repeatedPasswordError: null,
  isRepeatedPasswordValid: false,

  oldPassword: '',
  oldPasswordError: null,
  isOldPasswordValid: false,

  verificationCode: '',
  verificationCodeError: null,
  isVerificationCodeValid: false,

  isAgreementChecked: true, // legacy default — agreement pre-checked.
  isAgreementError: false,
  isSubscribeToNewsletterChecked: false,
  isLinkOauthAccountChecked: true,

  isPasswordTextShown: false,

  recaptureShown: false,
  captcha: '',
  isCaptureNotCompleteError: false,

  isConfirmDevice: false,
  isEmailCodeStep: false,
  isLinkOauth: false,
  oAuthError: null,
  googleJwtToken: null,
  isGoogleAuthLoading: false,

  timerNumber: null,
  isFetching: false,

  resetToken: null,
};

export function reducer(state: AuthFormState, action: AuthFormAction): AuthFormState {
  switch (action.type) {
    case 'SET_FORM':
      return {
        ...state,
        prevForm: action.remember ? state.currentForm : state.prevForm,
        currentForm: action.form,
        // Hide password text when changing forms (legacy line 1712).
        isPasswordTextShown: false,
      };

    case 'SET_EMAIL':
      return {
        ...state,
        email: action.value,
        isEmailValid: action.isValid,
        emailError: null,
        // Legacy: if value cleared, also clear the error state. If value
        // present but invalid, keep flagging as invalid (no inline message
        // until submit).
      };
    case 'CLEAR_EMAIL_ERROR':
      return { ...state, emailError: null };
    case 'SET_EMAIL_ERROR':
      return { ...state, emailError: action.error, isEmailValid: false };

    case 'SET_PASSWORD': {
      const errorText = passwordErrorToText(action.passwordError);
      return {
        ...state,
        password: action.value,
        passwordError: errorText,
        isPasswordValid: action.passwordError === null,
        // When password changes, recompute repeated-password validity.
        isRepeatedPasswordValid:
          action.matchesRepeated && state.repeatedPassword.length > 0,
        repeatedPasswordError: action.matchesRepeated ? null : state.repeatedPasswordError,
      };
    }
    case 'CLEAR_PASSWORD_ERROR':
      return { ...state, passwordError: null };
    case 'SET_PASSWORD_ERROR':
      return { ...state, passwordError: action.error, isPasswordValid: false };

    case 'SET_REPEATED_PASSWORD': {
      const errorText = repeatedErrorToText(action.error);
      return {
        ...state,
        repeatedPassword: action.value,
        repeatedPasswordError: errorText,
        isRepeatedPasswordValid: action.error === null,
      };
    }
    case 'CLEAR_REPEATED_PASSWORD_ERROR':
      return { ...state, repeatedPasswordError: null };

    case 'SET_OLD_PASSWORD': {
      const errorText = passwordErrorToText(action.passwordError);
      return {
        ...state,
        oldPassword: action.value,
        oldPasswordError: errorText,
        isOldPasswordValid: action.passwordError === null,
      };
    }
    case 'CLEAR_OLD_PASSWORD_ERROR':
      return { ...state, oldPasswordError: null };
    case 'SET_OLD_PASSWORD_ERROR':
      return { ...state, oldPasswordError: action.error, isOldPasswordValid: false };

    case 'SET_VERIFICATION_CODE': {
      const errorText = codeErrorToText(action.error);
      return {
        ...state,
        verificationCode: action.value,
        verificationCodeError: errorText,
        isVerificationCodeValid: action.error === null && action.value.length > 0,
      };
    }
    case 'CLEAR_VERIFICATION_CODE_ERROR':
      return { ...state, verificationCodeError: null };
    case 'SET_VERIFICATION_CODE_ERROR':
      return {
        ...state,
        verificationCodeError: action.error,
        isVerificationCodeValid: false,
      };

    case 'TOGGLE_AGREEMENT':
      return {
        ...state,
        isAgreementChecked: !state.isAgreementChecked,
        isAgreementError: false,
      };
    case 'SET_AGREEMENT_ERROR':
      return { ...state, isAgreementError: action.error };
    case 'TOGGLE_NEWSLETTER':
      return {
        ...state,
        isSubscribeToNewsletterChecked: !state.isSubscribeToNewsletterChecked,
      };
    case 'TOGGLE_LINK_OAUTH':
      return {
        ...state,
        isLinkOauthAccountChecked: !state.isLinkOauthAccountChecked,
      };

    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, isPasswordTextShown: !state.isPasswordTextShown };

    case 'SHOW_RECAPTURE':
      return { ...state, recaptureShown: true, captcha: '' };
    case 'SET_CAPTCHA':
      return { ...state, captcha: action.token, isCaptureNotCompleteError: false };
    case 'RESET_CAPTCHA':
      return { ...state, captcha: '' };
    case 'SET_CAPTURE_NOT_COMPLETE':
      return { ...state, isCaptureNotCompleteError: true };

    case 'SET_CONFIRM_DEVICE':
      return { ...state, isConfirmDevice: action.value };
    case 'SET_EMAIL_CODE_STEP':
      return { ...state, isEmailCodeStep: action.value };
    case 'SET_LINK_OAUTH':
      return { ...state, isLinkOauth: action.value };
    case 'SET_OAUTH_ERROR':
      return { ...state, oAuthError: action.error };
    case 'SET_GOOGLE_JWT':
      return { ...state, googleJwtToken: action.token };
    case 'SET_GOOGLE_LOADING':
      return { ...state, isGoogleAuthLoading: action.value };

    case 'TICK_TIMER':
      if (state.timerNumber === null || state.timerNumber <= 0) return state;
      return { ...state, timerNumber: state.timerNumber - 1 };
    case 'SET_TIMER':
      return { ...state, timerNumber: action.seconds };

    case 'SET_FETCHING':
      return { ...state, isFetching: action.value };

    case 'CLEAR_PASSWORDS':
      return {
        ...state,
        password: '',
        passwordError: null,
        isPasswordValid: false,
        repeatedPassword: '',
        repeatedPasswordError: null,
        isRepeatedPasswordValid: false,
        isAgreementError: false,
      };

    case 'CLEAR_FORM':
      return {
        ...state,
        email: '',
        emailError: null,
        isEmailValid: false,
        password: '',
        passwordError: null,
        isPasswordValid: false,
        repeatedPassword: '',
        repeatedPasswordError: null,
        isRepeatedPasswordValid: false,
        oldPassword: '',
        oldPasswordError: null,
        isOldPasswordValid: false,
        verificationCode: '',
        verificationCodeError: null,
        isVerificationCodeValid: false,
        oAuthError: null,
        isLinkOauth: false,
        isAgreementError: false,
        isCaptureNotCompleteError: false,
      };

    default:
      return state;
  }
}
