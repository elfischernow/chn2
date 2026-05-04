// Maps backend error codes (errorData.message) to i18n keys for inline UI
// messages. Replaces legacy `getCurrentErrorText` (authorization-helpeers.js)
// which did `messageSplit.forEach(item => errorText = errorText[item])` and
// silently returned `undefined` for unknown paths — see edge case E6.
//
// The dictionary below exhausts every legacy branch in authorization.jsx.
// Unknown codes fall back to `AUTHORIZATION.SERVER_ERROR` and the caller
// reports the unmapped code to Sentry so we notice new server messages.

import {
  AUTH_ERRORS,
  AUTH_GOOGLE_ERRORS,
  CHANGE_PASSWORD_ERRORS,
  TWO_FACTOR_ERRORS,
  USERS_ERRORS,
} from './constants';

export type AuthFlow =
  | 'login'
  | 'register'
  | 'google'
  | 'forgot'
  | 'reset'
  | 'change-password'
  | 'set-up-login'
  | '2fa'
  | 'email-resend';

export interface MappedError {
  /** i18n key the form should render. */
  i18nKey: string;
  /** Which field, if any, the error is bound to. */
  field?: 'email' | 'password' | 'oldPassword' | 'verificationCode' | 'agreement';
  /** True if this error indicates the user should be moved to another form. */
  redirectsForm?: boolean;
  /** True if we got an unmatched code — caller should log to Sentry. */
  unknown?: boolean;
}

const REGISTER_MAP: Record<string, MappedError> = {
  'AUTH.EMAIL.EMAIL_ALREADY_EXIST': {
    i18nKey: 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST',
    field: 'email',
  },
  // Legacy `getCurrentErrorText` walked the dot-path against
  // `ERRORS.AUTH.EMAIL_ALREADY_EXIST` only. Other server keys (e.g.
  // `AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST` shorthand) get the same UI.
  'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST': {
    i18nKey: 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST',
    field: 'email',
  },
};

const LOGIN_MAP: Record<string, MappedError> = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: {
    i18nKey: 'AUTHORIZATION.ACCOUNT_NOT_FOUND',
    field: 'password',
  },
  [AUTH_ERRORS.RETRY_LATER]: {
    i18nKey: 'AUTHORIZATION.TOO_MANY_REQUESTS',
    field: 'password',
  },
};

const GOOGLE_MAP: Record<string, MappedError> = {
  [AUTH_GOOGLE_ERRORS.EMAIL_ALREADY_EXISTS]: {
    i18nKey: 'AUTHORIZATION.OAUTH.GOOGLE_ERROR.EMAIL_ALREADY_EXISTS',
    field: 'password',
    redirectsForm: true, // → LOGIN with email pre-filled
  },
};

const FORGOT_MAP: Record<string, MappedError> = {
  [AUTH_ERRORS.BAD_REQUEST]: {
    i18nKey: 'AUTHORIZATION.EMAIL.INVALID_EMAIL',
    field: 'email',
  },
};

const TWO_FA_MAP: Record<string, MappedError> = {
  [AUTH_ERRORS.INVALID_CODE]: {
    i18nKey: 'AUTHORIZATION.INVALID_CODE',
    field: 'verificationCode',
  },
  [TWO_FACTOR_ERRORS.INVALID_CODE]: {
    // Legacy used 'Invalid code' (no i18n) for change-password 2FA. Unify to
    // the i18n key — fixes edge case E18.
    i18nKey: 'AUTHORIZATION.INVALID_CODE',
    field: 'verificationCode',
  },
};

const CHANGE_PASSWORD_MAP: Record<string, MappedError> = {
  [CHANGE_PASSWORD_ERRORS.PASSWORD_NOT_UPDATED]: {
    i18nKey: 'AUTHORIZATION.PASSWORD.INCORRECT',
    field: 'oldPassword',
  },
};

const SET_UP_LOGIN_MAP: Record<string, MappedError> = {
  [USERS_ERRORS.INVALID_CODE]: {
    i18nKey: 'AUTHORIZATION.INVALID_CODE',
    field: 'verificationCode',
  },
  [USERS_ERRORS.INVALID_EMAIL]: {
    i18nKey: 'AUTHORIZATION.EMAIL.INVALID_EMAIL',
    field: 'email',
  },
  [USERS_ERRORS.EMAIL_ALREADY_EXISTS]: {
    // Legacy uses _SET_UP variant before email-code step, plain after — both
    // are kept here so each call site can pick the right one.
    i18nKey: 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST_SET_UP',
    field: 'email',
  },
};

const FALLBACK: MappedError = {
  i18nKey: 'AUTHORIZATION.SERVER_ERROR',
  field: 'password',
  unknown: true,
};

const FLOW_MAPS: Record<AuthFlow, Record<string, MappedError>> = {
  register: REGISTER_MAP,
  login: LOGIN_MAP,
  google: GOOGLE_MAP,
  forgot: FORGOT_MAP,
  reset: {},
  'change-password': CHANGE_PASSWORD_MAP,
  'set-up-login': SET_UP_LOGIN_MAP,
  '2fa': TWO_FA_MAP,
  'email-resend': {
    [AUTH_ERRORS.BAD_REQUEST]: {
      i18nKey: 'AUTHORIZATION.EMAIL.INVALID_EMAIL',
      field: 'email',
    },
  },
};

export function mapAuthError(flow: AuthFlow, message: string | null | undefined): MappedError {
  if (!message) return FALLBACK;
  // Array variant from change-password (`['TWO_FACTOR_CODE.TO_LONG', ...]`).
  // Caller flattens before passing — but we accept just-in-case.
  const code = String(message);
  const entry = FLOW_MAPS[flow]?.[code];
  if (entry) return entry;
  return FALLBACK;
}

// Convenience matcher for the array case: `errorMessage` arriving as
// `['TWO_FACTOR_CODE.TO_LONG', 'TWO_FACTOR_CODE.NOT_MATCH']`.
export function isTwoFactorCodeArrayError(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(
    (v) =>
      v === TWO_FACTOR_ERRORS.CODE_TOO_LONG || v === TWO_FACTOR_ERRORS.CODE_NOT_MATCH,
  );
}
