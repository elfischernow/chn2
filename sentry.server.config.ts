// Server-side Sentry init. Loaded by `instrumentation.ts` in the Node
// runtime only (Edge has its own config to keep the bundle slim).
//
// Mirrors legacy src/server/helpers/sentry-node-init.js. We intentionally
// disable PII auto-collection — request bodies and headers can carry
// emails / refresh tokens.

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
