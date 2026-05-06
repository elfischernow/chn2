'use client';

// Mirrors legacy src/server/scripts/client/error-logs-collection.js — fans
// out unhandled errors and rejections to both:
//   1. GA (CN_SITE_ERROR category) — for the marketing dashboard
//   2. Sentry — for engineering triage
// Sentry already auto-captures unhandled errors via @sentry/nextjs; we
// stay opt-in here to keep the GA leg working without double-reporting to
// Sentry from this hook (we call Sentry.captureMessage with a tag instead
// of captureException so the SDK's auto-capture doesn't dedupe us out).

import { useEffect } from 'react';

import { errorEvents } from '@/lib/analytics/events';
import { sentryReportMessage } from '@/lib/sentry/report';

export function GlobalErrorReporter(): null {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || 'unknown';
      errorEvents.jsGlobal(message);
      sentryReportMessage('global_error', {
        level: 'error',
        tags: { source: 'window.onerror' },
        extras: { message, filename: event.filename, line: event.lineno },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message ?? String(reason ?? 'unknown');
      errorEvents.jsUnhandled(message);
      sentryReportMessage('unhandled_rejection', {
        level: 'error',
        tags: { source: 'unhandledrejection' },
        extras: { message },
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
