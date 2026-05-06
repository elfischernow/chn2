import type { GaTrackEventArgs } from './types';

// Thin shims over `window.ga` — the inline GA4 snippet attaches it on load.
// Mirrors legacy src/react-ssr/utils/client/track-event.js + track-pro-event.js.
// No-ops when the snippet didn't render (analytics disabled, bot, SSR).

export function trackEvent(event: GaTrackEventArgs): void {
  if (typeof window === 'undefined') return;
  const ga = window.ga;
  if (!ga || typeof ga.trackEvent !== 'function') return;
  ga.trackEvent(event.category, event.action, event.label, event.value);
}

export interface ProEventArgs {
  eventName: string;
  user_type?: string;
  user_property?: string;
  platform?: string;
}

export function trackProEvent(event: ProEventArgs): void {
  if (typeof window === 'undefined') return;
  const ga = window.ga;
  if (!ga || typeof ga.trackProEvent !== 'function') return;
  ga.trackProEvent(event.eventName, event.platform, event.user_type, event.user_property);
}
