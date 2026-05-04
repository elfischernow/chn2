/**
 * Next.js instrumentation hook. Runs once per server process on startup
 * (Node runtime only — Edge runtime calls this too but with different
 * semantics; we gate on NEXT_RUNTIME).
 *
 * Today: starts the in-app cron runner that keeps the URL Registry warm
 * and prewarms top pages. See lib/cron/runner.ts for the schedule.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Avoid spawning cron during `next build` — instrumentation runs there
  // too and we don't want the build process to hold timers open.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startCron } = await import('@/lib/cron/runner');
  startCron();
}
