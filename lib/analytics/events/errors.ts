// Marketing-side error funnel — duplicates Sentry on purpose, mirrors
// legacy CN_SITE_ERROR scheme so the existing GA dashboard keeps working.

import { SITE_ERROR_ACTIONS, SITE_ERROR_CATEGORY } from '../constants';
import { trackEvent } from '../track';

export const errorEvents = {
  jsUnhandled(message: string): void {
    trackEvent({
      category: SITE_ERROR_CATEGORY,
      action: SITE_ERROR_ACTIONS.UNHANDLED_ERROR,
      label: message,
    });
  },
  jsGlobal(message: string): void {
    trackEvent({
      category: SITE_ERROR_CATEGORY,
      action: SITE_ERROR_ACTIONS.GLOBAL_ERROR,
      label: message,
    });
  },
  apiError(endpoint: string, status: number | string): void {
    trackEvent({
      category: SITE_ERROR_CATEGORY,
      action: SITE_ERROR_ACTIONS.API_ERROR,
      label: `${endpoint}:${status}`,
    });
  },
  cssLoading(href: string): void {
    trackEvent({
      category: SITE_ERROR_CATEGORY,
      action: SITE_ERROR_ACTIONS.CSS_LOADING_ERROR,
      label: href,
    });
  },
} as const;
