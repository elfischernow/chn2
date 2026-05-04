import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

const SECRET = process.env.WARM_CACHE_SECRET;

/**
 * POST /api/warm-cache
 *
 * Bust caches that need fresh data on demand. Mirrors the blog's warm-cache
 * worker — the homepage doesn't have post listings, but the same shape lets
 * us invalidate i18n on translation deploys, or rate/price tiles when the
 * upstream pricing service publishes.
 *
 * Auth: Bearer token via WARM_CACHE_SECRET. No secret = endpoint disabled.
 */
export async function POST(req: Request) {
  if (!SECRET) {
    return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags = body.tags && body.tags.length > 0 ? body.tags : ['i18n', 'rates'];

  // `profile: "max"` gives stale-while-revalidate semantics — tagged data
  // is marked stale and refreshed on the next request, no thundering herd.
  for (const tag of tags) revalidateTag(tag, 'max');

  return NextResponse.json({ ok: true, revalidated: tags });
}
