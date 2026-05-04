// Constants ported 1:1 from legacy. Source files:
//   legacy-projects/changenow-frontend/src/react-ssr/constants/authorization.js
//   legacy-projects/changenow-frontend/src/react-ssr/constants/errors.js
//   legacy-projects/changenow-frontend/src/react-ssr/constants/wallet-connect.js
//   legacy-projects/changenow-frontend/src/react-ssr/constants/sentry-constants.js
//   legacy-projects/changenow-frontend/src/react-ssr/constants/pro-settings-constants.js
//
// Names are preserved verbatim because they appear in analytics, Sentry tags,
// i18n keys, and backend error payloads — renaming silently breaks dashboards.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_PATTERN = /^\d+$/;
export const DEFAULT_TIMER_NUMBER = 60;
export const HTTP_CONFLICT_ERROR_CODE = 409;

export const REFRESH_TOKEN_KEY = 'refresh-token';
export const USER_ID_KEY = 'uid';
export const PREDICTIONS_REDIRECT_CONTEXT_KEY = 'predictions-redirect-context';

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  RETRY_LATER: 'AUTH.RETRY_LATER',
  CAPTCHA_NEEDED: 'AUTH.CAPTCHA_NEEDED',
  CODE_NEEDED: 'AUTH.CODE_NEEDED',
  INVALID_CODE: 'AUTH.INVALID_CODE',
  FA_CODE_NEEDED: '2FA_CODE_NEEDED',
  FORGOTTEN_PASSWORD_RETRY_LATER: 'AUTH.FORGOTTEN_PASSWORD.RETRY_LATER',
  BAD_REQUEST: 'Bad Request',
} as const;

export const USERS_ERRORS = {
  CODE_NEEDED: 'USERS.SETUP_LOGIN_EMAIL_CODE_NEEDED',
  INVALID_CODE: 'USERS.SETUP_LOGIN_INVALID_EMAIL_CODE',
  INVALID_EMAIL: 'USERS.SETUP_LOGIN_NOT_ALLOWED',
  EMAIL_ALREADY_EXISTS: 'USERS.SETUP_LOGIN_EMAIL_ALREADY_EXISTS',
} as const;

export const AUTH_GOOGLE_ERRORS = {
  INVALID_PAYLOAD: 'GOOGLE_AUTH.INVALID_PAYLOAD',
  EMAIL_ALREADY_EXISTS: 'GOOGLE_AUTH.FOUND_USER_NOT_ALLOWED',
} as const;

export const TWO_FACTOR_ERRORS = {
  INVALID_CODE: 'TWO_FACTOR.INVALID_CODE',
  CODE_TOO_LONG: 'TWO_FACTOR_CODE.TO_LONG',
  CODE_NOT_MATCH: 'TWO_FACTOR_CODE.NOT_MATCH',
} as const;

export const CHANGE_PASSWORD_ERRORS = {
  PASSWORD_NOT_UPDATED: 'USER.PASSWORD_NOT_UPDATED',
} as const;

export const PASSWORD_QUALITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type PasswordQualityLevel =
  (typeof PASSWORD_QUALITY_LEVELS)[keyof typeof PASSWORD_QUALITY_LEVELS];

// Resend bucket rules (use-resend-timeout.ts in legacy).
export const RESEND_TIMEOUT = {
  STORAGE_KEY: 'resend_state',
  MAX_ATTEMPTS: 10,
  WARNING_THRESHOLD: 7,
} as const;

// Analytics actions, Sentry types — used by both forms and telemetry layer.
export const AUTHORIZATION_EVENT_CATEGORIES = {
  USER_ENGAGEMENT: 'user-engagement',
  LOGIN: 'login',
} as const;

export const AUTHORIZATION_ERRORS = {
  SIGN_UP: {
    CAPTCHA_NEEDED: 'AUTHORIZATION.SIGN_UP.CAPTCHA_NEEDED',
    TOO_MANY_REQUESTS: 'AUTHORIZATION.SIGN_UP.TOO_MANY_REQUESTS',
    SOMETHING_WRONG: 'AUTHORIZATION.SIGN_UP.SOMETHING_WRONG',
    SOMETHING_ERROR: 'AUTHORIZATION.SIGN_UP.SOMETHING_ERROR',
  },
  SIGN_IN: {
    CAPTCHA_NEEDED: 'AUTHORIZATION.SIGN_IN.CAPTCHA_NEEDED',
    TOO_MANY_REQUESTS: 'AUTHORIZATION.SIGN_IN.TOO_MANY_REQUESTS',
    SOMETHING_WRONG: 'AUTHORIZATION.SIGN_IN.SOMETHING_WRONG',
    INVALID_CREDENTIALS: 'AUTHORIZATION.SIGN_IN.INVALID_CREDENTIALS',
    EMAIL_CODE_NEEDED: 'AUTHORIZATION.SIGN_IN.EMAIL_CODE_NEEDED',
    TWO_FACTOR_INVALID_CODE: 'AUTHORIZATION.SIGN_IN.TWO_FACTOR_INVALID_CODE',
    WITHOUT_CAPTCHA: 'AUTHORIZATION.SIGN_IN.WITHOUT_CAPTCHA',
    SERVER_ERROR: 'AUTHORIZATION.SIGN_IN.SERVER_ERROR',
  },
  AUTHENTICATE: {
    TOO_MANY_REQUESTS: 'AUTHORIZATION.AUTHENTICATE.TOO_MANY_REQUESTS',
    TWO_FACTOR_INVALID_CODE: 'AUTHORIZATION.AUTHENTICATE.TWO_FACTOR_INVALID_CODE',
    SOMETHING_WRONG: 'AUTHORIZATION.AUTHENTICATE.SOMETHING_WRONG',
  },
  FORGOT_PASSWORD: {
    SOMETHING_WRONG: 'AUTHORIZATION.FORGOT_PASSWORD.SOMETHING_WRONG',
    CAPTCHA_NEEDED: 'AUTHORIZATION.FORGOT_PASSWORD.CAPTCHA_NEEDED',
    BAD_REQUEST: 'AUTHORIZATION.FORGOT_PASSWORD.BAD_REQUEST_INVALID_EMAIL',
    RETRY_LATER: 'AUTHORIZATION.FORGOT_PASSWORD.RETRY_LATER',
  },
  RESET_PASSWORD: {
    LINK_NOT_FOUND: 'AUTHORIZATION.RESET_PASSWORD.LINK_NOT_FOUND',
    TOO_MANY_REQUESTS_OR_NULL: 'AUTHORIZATION.RESET_PASSWORD.TOO_MANY_REQUESTS_OR_NULL',
  },
  CHANGE_PASSWORD: {
    SOMETHING_WRONG: 'AUTHORIZATION.CHANGE_PASSWORD.SOMETHING_WRONG',
    NOT_UPDATED: 'AUTHORIZATION.CHANGE_PASSWORD.NOT_UPDATED_WRONG_PASSWORD',
    CAPTCHA_NEEDED: 'AUTHORIZATION.CHANGE_PASSWORD.CAPTCHA_NEEDED',
    TWO_FACTOR_INVALID_CODE: 'AUTHORIZATION.CHANGE_PASSWORD.TWO_FACTOR_INVALID_CODE',
  },
} as const;

export const SENTRY_ERRORS_TYPES = {
  STORE_ERROR: 'store_error',
  REGISTER_ERROR: 'register_error',
  LOGIN_ERROR: 'login_error',
  FORGOT_PASSWORD_ERROR: 'forgot_password_error',
  CHANGE_PASSWORD_ERROR: 'change_password_error',
  SET_UP_LOGIN_ERROR: 'set_up_login_error',
  RESEND_EMAIL_ERROR: 'resend_email_error',
  RESET_PASSWORD_ERROR: 'reset_password_error',
  AUTHENTICATE_ERROR: 'authenticate_error',
} as const;

export const SENTRY_ERRORS_MESSAGES = {
  CONNECTION_ERROR: 'Connection error',
  TO_MANY_RESENDS: 'Too many resends',
} as const;

// Wallet-Connect / Metamask error vocabulary.
export const WALLET_CONNECT_ERRORS = {
  ADDRESS_ALREADY_EXISTS: 'This address already exists',
  REJECTED: 'UserRejectedRequestError',
  USER_CLOSED_MODAL: 'User closed modal',
  CONNECTION_REQUEST_RESET: 'Connection request reset. Please try again.',
} as const;

export const WALLET_CONNECT_ERROR_TYPES = {
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  USER_REJECTED: 'USER_REJECTED',
  DENIED_SIGNATURE: 'DENIED_SIGNATURE',
  DENIED_TRANSACTION: 'DENIED_TRANSACTION',
  SOMETHING_WRONG: 'SOMETHING_WRONG',
} as const;

export type WalletConnectErrorType =
  (typeof WALLET_CONNECT_ERROR_TYPES)[keyof typeof WALLET_CONNECT_ERROR_TYPES];

// Substring matchers for "user denied" wallet errors. Matched case-insensitively.
export const USER_DENIED_SIGN_KEYWORDS = [
  'denied',
  'rejected',
  'canceled',
  'cancel',
  'reject',
  'error',
  'disconnect',
] as const;

// Session-storage flags set elsewhere in the app, read by post-auth redirect.
// Legacy never clears these — see edge case E1 in docs/auth-migration-plan.md.
// resolvePostAuthTarget() must read+remove atomically.
export const POST_AUTH_FLAGS = {
  OPEN_FROM_FIAT_MODE: 'isOpenFromFiatMode',
  OPEN_FROM_CASHBACK_TOOLTIP: 'isOpenFromCashbackTooltip',
} as const;

// Default landing after successful auth when no other signal applies.
// Per product requirement, login/registration must default to /pro/balance.
export const DEFAULT_REDIRECT_PATH = '/pro/balance';
export const EXCHANGE_REDIRECT_PATH = '/pro/exchange';
export const PREDICTIONS_REDIRECT_PATH = '/pro/predictions';
export const CRYPTO_LOAN_PATH = '/crypto-loan';

// REDIRECT_RULES from legacy authorization.js:99-102 — both flags currently
// route to /pro/exchange. Kept as an array so we can add rules without
// touching resolvePostAuthTarget().
export const REDIRECT_RULES: ReadonlyArray<{ flag: string; targetPath: string }> = [
  { flag: POST_AUTH_FLAGS.OPEN_FROM_FIAT_MODE, targetPath: EXCHANGE_REDIRECT_PATH },
  { flag: POST_AUTH_FLAGS.OPEN_FROM_CASHBACK_TOOLTIP, targetPath: EXCHANGE_REDIRECT_PATH },
];

// `?next=<path>` allow-list. Only paths matching one of these prefixes/regexes
// are honoured; anything else falls back to DEFAULT_REDIRECT_PATH. Prevents
// open-redirect to evil.com and avoids misroutes to non-Pro pages.
export const NEXT_PARAM_ALLOWLIST: ReadonlyArray<RegExp> = [
  /^\/pro\/balance(?:\/txs\/[A-Za-z0-9-]+)?$/,
  /^\/pro\/exchange(?:\/txs\/[A-Za-z0-9-]+)?$/,
  /^\/pro\/history$/,
  /^\/pro\/loans$/,
  /^\/pro\/loan\/[A-Za-z0-9-]+$/,
  /^\/pro\/confirmation-loan$/,
  /^\/pro\/cashback$/,
  /^\/pro\/plans$/,
  /^\/pro\/aml-check$/,
  /^\/pro\/staking$/,
  /^\/pro\/predictions$/,
  /^\/pro\/settings$/,
];

// Storage keys cleared on logout (LOGOUT_STORAGE_KEYS in legacy).
export const LOGOUT_STORAGE_KEYS: ReadonlyArray<string> = [
  REFRESH_TOKEN_KEY,
  USER_ID_KEY,
  'balance-tab',
  'balance-asset',
  'market-price-accordion-open',
];
