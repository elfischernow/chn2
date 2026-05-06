// Auth events. Pro events go through window.ga.trackProEvent (separate
// GA4 event names) — everything else is a normal trackEvent call.
//
// Category names mirror legacy 'authorization' / 'login' so existing
// funnels keep aggregating.

import { PRO_EVENT_NAMES, PRO_USER_TYPES } from '../constants';
import { trackEvent, trackProEvent } from '../track';

export const authEvents = {
  startSignup(): void {
    trackProEvent({
      eventName: PRO_EVENT_NAMES.SIGN_UP_START,
      user_type: PRO_USER_TYPES.GUEST,
    });
    trackEvent({ category: 'authorization', action: 'auth_start_signup' });
  },
  submitEmail(): void {
    trackProEvent({
      eventName: PRO_EVENT_NAMES.SUBMIT_MAIL,
      user_type: PRO_USER_TYPES.GUEST,
    });
    trackEvent({ category: 'authorization', action: 'auth_submit_email' });
  },
  loginSuccess(): void {
    trackProEvent({
      eventName: PRO_EVENT_NAMES.AUTH_SUCCESS,
      user_type: PRO_USER_TYPES.AUTHENTICATED,
    });
    trackEvent({ category: 'authorization', action: 'auth_login_success' });
  },
  loginError(label?: string): void {
    trackEvent({ category: 'authorization', action: 'auth_login_error', label });
  },
  forgotPassword(): void {
    trackEvent({ category: 'authorization', action: 'auth_forgot_password' });
  },
  resetPassword(): void {
    trackEvent({ category: 'authorization', action: 'auth_reset_password' });
  },
  logout(): void {
    trackEvent({ category: 'authorization', action: 'auth_logout' });
  },
} as const;
