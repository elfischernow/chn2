import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// Strip user data before transmit. Mirrors legacy beforeSend in
// src/client/js/sentry-init.js (PII-by-omission stance — we never want
// emails, IPs, or session ids reaching Sentry's servers).
export function stripUser(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.user) {
    const { user: _user, ...rest } = event;
    return rest;
  }
  return event;
}
