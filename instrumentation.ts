import * as Sentry from '@sentry/nextjs';

/**
 * Next.js instrumentation hook. Runs once per server process on startup.
 * Two responsibilities:
 *   1. Initialise Sentry on the active runtime (Node or Edge).
 *   2. Start the in-app cron runner (Node only) — keeps the URL Registry
 *      warm and prewarms top pages. See lib/cron/runner.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Avoid spawning cron during `next build` — instrumentation runs there
  // too and we don't want the build process to hold timers open.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startCron } = await import('@/lib/cron/runner');
  startCron();
}

// Required by Sentry to capture errors thrown in nested React Server
// Components and route handlers under the App Router.
export const onRequestError = Sentry.captureRequestError;
