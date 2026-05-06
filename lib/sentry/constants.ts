// Sentry vocabulary — copied 1:1 from legacy so dashboard tags keep working.
//   legacy-projects/changenow-frontend/src/client/constants/sentry-constants.js
//   legacy-projects/changenow-frontend/src/react-ssr/constants/sentry-constants.js

export const SENTRY_IGNORE_ERRORS = ['AbortError', 'AbortSignal'] as const;

export const SENTRY_ERROR_TYPES = {
  STORE_ERROR: 'store_error',
  REGISTER_ERROR: 'register_error',
  LOGIN_ERROR: 'login_error',
  FORGOT_PASSWORD_ERROR: 'forgot_password_error',
  CHANGE_PASSWORD_ERROR: 'change_password_error',
  SET_UP_LOGIN_ERROR: 'set_up_login_error',
  RESEND_EMAIL_ERROR: 'resend_email_error',
  RESET_PASSWORD_ERROR: 'reset_password_error',
  AUTHENTICATE_ERROR: 'authenticate_error',
  API_ERROR: 'api_error',
  WS_ERROR: 'ws_error',
  I18N_ERROR: 'i18n_error',
  CALCULATOR_ERROR: 'calculator_error',
} as const;

export type SentryErrorType =
  (typeof SENTRY_ERROR_TYPES)[keyof typeof SENTRY_ERROR_TYPES];

export const SENTRY_ERROR_MESSAGES = {
  CONNECTION_ERROR: 'Connection error',
  TOO_MANY_RESENDS: 'Too many verification code resends',
} as const;
