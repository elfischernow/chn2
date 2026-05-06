import * as Sentry from '@sentry/nextjs';

import type { SentryErrorType } from './constants';

interface ReportPayload {
  error: unknown;
  type?: SentryErrorType | string;
  status?: number | string | null;
  errorMessage?: string;
  extras?: Record<string, unknown>;
  tags?: Record<string, string>;
  level?: Sentry.SeverityLevel;
  fingerprint?: string[];
}

// Mirrors legacy `sentryReportError` (src/react-ssr/helpers/sentry-report-error.js)
// with the extras/tags/level/fingerprint additions we need for Phase 4.
export function sentryReportError({
  error,
  type,
  status,
  errorMessage,
  extras,
  tags,
  level,
  fingerprint,
}: ReportPayload): void {
  Sentry.withScope((scope) => {
    if (type) scope.setTag('error_type', type);
    if (status !== undefined && status !== null) {
      scope.setTag('error_status', String(status));
    }
    if (errorMessage) scope.setExtra('error_message', errorMessage);
    if (extras) {
      for (const [k, v] of Object.entries(extras)) scope.setExtra(k, v);
    }
    if (tags) {
      for (const [k, v] of Object.entries(tags)) scope.setTag(k, v);
    }
    if (level) scope.setLevel(level);
    if (fingerprint) scope.setFingerprint(fingerprint);

    // Sentry's captureException accepts unknown — non-Error values become
    // synthetic messages, which is friendlier than crashing on bad inputs.
    Sentry.captureException(error);
  });
}

// Lightweight wrapper for non-error events (i18n misses, rate-limit warnings).
export function sentryReportMessage(
  message: string,
  options?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extras?: Record<string, unknown>;
    fingerprint?: string[];
  },
): void {
  Sentry.withScope((scope) => {
    if (options?.tags) {
      for (const [k, v] of Object.entries(options.tags)) scope.setTag(k, v);
    }
    if (options?.extras) {
      for (const [k, v] of Object.entries(options.extras)) scope.setExtra(k, v);
    }
    if (options?.fingerprint) scope.setFingerprint(options.fingerprint);
    if (options?.level) scope.setLevel(options.level);
    Sentry.captureMessage(message);
  });
}
