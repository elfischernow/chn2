// Globals exposed by the inline scripts in components/analytics/AnalyticsScripts.tsx.
//
// `window.ga` here is *not* legacy Universal Analytics. It's our custom GA4
// shim that the inline snippet attaches — same name kept for parity with
// legacy track-event.js so call sites read the same.

export interface GaTrackEventArgs {
  category: string;
  action: string;
  label?: string;
  value?: string | number | object;
}

export interface GaShim {
  trackEvent(category: string, action: string, label?: string, value?: unknown): void;
  trackProEvent(
    eventName: string,
    platform: string | undefined,
    user_type: string | undefined,
    user_property: string | undefined,
  ): void;
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
}

declare global {
  interface Window {
    ga?: GaShim;
    getUTMs?: () => UtmParams;
  }
}

export {};
