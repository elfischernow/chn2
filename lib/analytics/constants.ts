// Event vocabulary — copied 1:1 from legacy
// (src/react-ssr/constants/analytics-constants.js) so existing GA4 dashboards
// keep aggregating without rebuilds.

export const EVENT_TYPES = {
  CONTACT_SALES: 'select_contact_sales',
  GET_FREE_API_KEY: 'select_free_api',
  SEND_TICKET: 'generate_lead_partners',
  PAID_PLAN: 'paid_plan',
  ERROR: 'error',
  MAIN: 'main',
  EXCHANGE: 'exchange',
  EXCHANGE_STEPPER: 'exchange_stepper',
} as const;

export const ACTION_TYPES = {
  BUTTON_CLICK: 'button_click',
  SEND_FORM: 'send_form',
  SWAP_UNAVAILABLE_COIN: 'swap_unavailable_coin',
} as const;

export const NO_AUTH_ACTIONS = {
  PRESS_NEW_TX: 'press_new_TX_no_auth',
  PRESS_HISTORY: 'press_no_auth_history',
  PRESS_CLEAR_HISTORY: 'press_clear_no_auth_history',
  PRESS_HISTORY_BUTTON: 'press_no_auth_history_button',
  PRESS_TX: 'no_auth_history_tx',
} as const;

export const PRO_EVENT_NAMES = {
  SIGN_UP_START: 'pro_start_sign_up',
  SUBMIT_MAIL: 'pro_submit_mail',
  AUTH_SUCCESS: 'pro_auth',
} as const;

export const PRO_USER_TYPES = {
  AUTHENTICATED: 'authenticated',
  GUEST: 'guest',
} as const;

export const PRO_USER_PROPERTIES = {
  AUTHENTICATED: 'authenticated',
  GUEST: 'guest',
} as const;

// Site-error category — paired with action enums below. Mirrors legacy
// CN_SITE_ERROR namespace from src/server/scripts/client/error-logs-collection.js
// so the marketing dashboard keeps showing JS / network failures.
export const SITE_ERROR_CATEGORY = 'CN_SITE_ERROR';

export const SITE_ERROR_ACTIONS = {
  ERROR: 'ERROR',
  UNHANDLED_ERROR: 'UNHANDLED_ERROR',
  GLOBAL_ERROR: 'GLOBAL_ERROR',
  CSS_LOADING_ERROR: 'CSS_LOADING_ERROR',
  API_ERROR: 'API_ERROR',
} as const;
