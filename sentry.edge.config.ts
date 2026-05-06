// Edge-runtime Sentry init. Stripped down — no Node-only integrations,
// no replay (browser-only), no auto-instrumented HTTP (Edge fetch is
// already wrapped by Next).

import * as Sentry from '@sentry/nextjs';

import { SENTRY_IGNORE_ERRORS } from '@/lib/sentry/constants';
import { sentryEnv } from '@/lib/sentry/env';

if (sentryEnv.dsn) {
  Sentry.init({
    dsn: sentryEnv.dsn,
    environment: sentryEnv.environment,
    release: sentryEnv.release,
    ignoreErrors: [...SENTRY_IGNORE_ERRORS],
    sendDefaultPii: false,
    tracesSampleRate: sentryEnv.tracesSampleRate,
  });
}
