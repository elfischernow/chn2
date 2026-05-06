// Sentry browser SDK init. Next 16 + Sentry 10 picks this file up
// automatically (the older `sentry.client.config.ts` convention is gone).
//
// Mirrors legacy src/client/js/sentry-init.js:
//   - browserTracing + replay integrations
//   - replay masks inputs but leaves text/media visible
//   - PII strip in beforeSend
//   - sampling rates env-driven, defaults safe-for-prod
//   - ignoreErrors covers the AbortError noise legacy was deduping

import * as Sentry from '@sentry/nextjs';

import { stripUser } from '@/lib/sentry/before-send';
import { SENTRY_IGNORE_ERRORS } from '@/lib/sentry/constants';
import { sentryEnv } from '@/lib/sentry/env';

if (sentryEnv.dsn) {
  try {
    Sentry.init({
      dsn: sentryEnv.dsn,
      environment: sentryEnv.environment,
      release: sentryEnv.release,
      ignoreErrors: [...SENTRY_IGNORE_ERRORS],
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
          maskAllInputs: true,
        }),
      ],
      beforeSend: stripUser,
      tracesSampleRate: sentryEnv.tracesSampleRate,
      replaysSessionSampleRate: sentryEnv.replaysSessionSampleRate,
      replaysOnErrorSampleRate: sentryEnv.replaysOnErrorSampleRate,
    });

    if (typeof window !== 'undefined') {
      if (window.screen) {
        Sentry.setTag(
          'user_screen_size',
          `${window.screen.width}x${window.screen.height}`,
        );
      }
      const path = window.location.pathname;
      const localeMatch = path.match(/^\/([a-z]{2})(?:\/|$)/);
      Sentry.setTag('site_locale', localeMatch?.[1] ?? 'en');
    }
  } catch (error) {
    // Init failure must never crash the page. Console only — Sentry isn't up.
    console.error('Sentry init error', error);
  }
}

// Required for client-side router transition tracing in Sentry 10+.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
