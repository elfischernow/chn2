import { NextResponse } from 'next/server';

import { getCurrencies } from '@/lib/api/currencies';
import { rebuildRegistry } from '@/lib/api/url-registry';
import { redisAcquireLock } from '@/lib/cache/redis';

/**
 * Cron entry-point. Triggered by the in-app cron runner (or any external
 * scheduler that knows the token). All work is gated by `TICK_TOKEN` so
 * a leaked URL alone doesn't let strangers DoS Strapi.
 *
 * Jobs (see docs/currencies-migration.md §4.6):
 *   - `registry` (every ~10 min): rebuild the URL Registry.
 *   - `catalog`  (every ~5 min):  refresh the currency catalog cache.
 *   - `warm`     (every ~1 hr):   prefetch the top-30 pages.
 *
 * Distributed locks (Redis SET NX EX) ensure only one pod runs each job
 * per interval. When Redis is down, the lock is taken locally — multi-pod
 * redundancy is acceptable for these workloads.
 */

export const dynamic = 'force-dynamic';

const TICK_TOKEN = process.env.TICK_TOKEN;

export async function POST(req: Request): Promise<NextResponse> {
  if (!TICK_TOKEN) {
    return NextResponse.json({ error: 'TICK_TOKEN not configured' }, { status: 503 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get('token') !== TICK_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const job = url.searchParams.get('job');
  switch (job) {
    case 'registry':
      return runRegistry();
    case 'catalog':
      return runCatalog();
    case 'warm':
      return runWarm();
    default:
      return NextResponse.json({ error: `unknown job: ${job}` }, { status: 400 });
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  return POST(req);
}

async function runRegistry(): Promise<NextResponse> {
  const lock = await redisAcquireLock('tick:lock:registry', 600);
  if (!lock) {
    return NextResponse.json({ ok: true, skipped: 'lock held by another pod' });
  }
  try {
    const { size } = await rebuildRegistry();
    return NextResponse.json({ ok: true, job: 'registry', size });
  } catch (err) {
    return NextResponse.json(
      { ok: false, job: 'registry', error: String(err) },
      { status: 500 },
    );
  }
}

async function runCatalog(): Promise<NextResponse> {
  const lock = await redisAcquireLock('tick:lock:catalog', 300);
  if (!lock) {
    return NextResponse.json({ ok: true, skipped: 'lock held by another pod' });
  }
  try {
    const items = await getCurrencies();
    return NextResponse.json({ ok: true, job: 'catalog', count: items.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, job: 'catalog', error: String(err) },
      { status: 500 },
    );
  }
}

async function runWarm(): Promise<NextResponse> {
  // Top-only warm. Phase 0 stub: page resolvers don't exist yet so there
  // is nothing to warm. Implementation lands in Phase 3 when /currencies/[coin]
  // is in place.
  return NextResponse.json({
    ok: true,
    job: 'warm',
    note: 'stub — implemented in Phase 3 when coin/pair pages exist',
  });
}
