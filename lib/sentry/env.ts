// Centralised env reads so client/server/edge configs stay in sync.

const parseRate = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const sentryEnv = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_CLIENT ?? process.env.SENTRY_DSN_CLIENT ?? '',
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE,
  tracesSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
      process.env.SENTRY_PARAMS_TRACES_SAMPLE_RATE,
    0,
  ),
  replaysSessionSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ??
      process.env.SENTRY_PARAMS_REPLAYS_SESSION_SAMPLE_RATE,
    0,
  ),
  replaysOnErrorSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ??
      process.env.SENTRY_PARAMS_REPLAYS_ON_ERROR_SAMPLE_RATE,
    1,
  ),
} as const;
