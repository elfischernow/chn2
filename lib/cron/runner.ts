import 'server-only';

/**
 * In-app cron runner. Started by `instrumentation.ts` on the server. Why
 * here and not a side-app:
 *   - Operationally cheaper (no extra container to deploy / monitor).
 *   - Single source of code, so changes to job logic ship together.
 *
 * Multi-pod redundancy is handled inside `/api/tick` itself via Redis
 * SET NX EX locks. When Redis is down the lock returns true everywhere,
 * which means N pods will run the same job — acceptable cost for the
 * small set of jobs we run, and Strapi has its own caching upstream.
 *
 * Why HTTP self-fetch instead of importing the job functions directly:
 * `unstable_cache`-wrapped helpers (getCurrencies, rebuildRegistry, ...)
 * require a request scope to access the incremental cache context. A
 * setInterval-driven import has no scope and trips
 * `Invariant: incrementalCache missing in unstable_cache`. Hitting our
 * own `/api/tick` endpoint gives us a real request context where the
 * cache machinery works. The HTTP overhead is negligible (localhost,
 * inside the same process).
 */

const REGISTRY_INTERVAL_MS = 10 * 60 * 1000;
const CATALOG_INTERVAL_MS = 5 * 60 * 1000;
const WARM_INTERVAL_MS = 60 * 60 * 1000;

// Initial-run delays so we don't pile work onto a cold pod's first seconds.
const REGISTRY_INITIAL_DELAY_MS = 30 * 1000;
const CATALOG_INITIAL_DELAY_MS = 15 * 1000;
const WARM_INITIAL_DELAY_MS = 5 * 60 * 1000;

let started = false;

/**
 * Start the cron loops. Called from `instrumentation.ts`. Idempotent — HMR
 * in dev will re-import the module but won't double-register intervals.
 */
export function startCron(): void {
  if (started) return;
  started = true;

  scheduleJob('registry', REGISTRY_INITIAL_DELAY_MS, REGISTRY_INTERVAL_MS);
  scheduleJob('catalog', CATALOG_INITIAL_DELAY_MS, CATALOG_INTERVAL_MS);
  scheduleJob('warm', WARM_INITIAL_DELAY_MS, WARM_INTERVAL_MS);

  console.log('[cron] started: registry/10m, catalog/5m, warm/1h');
}

function scheduleJob(
  name: 'registry' | 'catalog' | 'warm',
  delayMs: number,
  intervalMs: number,
): void {
  setTimeout(() => {
    void runOnce(name);
    setInterval(() => {
      void runOnce(name);
    }, intervalMs);
  }, delayMs);
}

async function runOnce(job: 'registry' | 'catalog' | 'warm'): Promise<void> {
  const start = Date.now();
  try {
    await callTick(job);
    console.log(`[cron] ${job} ok in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`[cron] ${job} failed in ${Date.now() - start}ms:`, err);
  }
}

async function callTick(job: 'registry' | 'catalog' | 'warm'): Promise<void> {
  const port = process.env.PORT ?? '3000';
  const token = process.env.TICK_TOKEN ?? '';
  if (!token) throw new Error('TICK_TOKEN not set');
  const url = `http://127.0.0.1:${port}/api/tick?token=${encodeURIComponent(token)}&job=${job}`;
  // Plain fetch — bypass any Next instrumentation. We just need a request
  // scope to materialize at the route handler.
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`tick ${job} returned ${res.status}`);
}
