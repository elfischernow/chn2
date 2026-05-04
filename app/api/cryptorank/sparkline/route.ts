import { NextResponse, type NextRequest } from 'next/server';

import {
  getSparkline,
  isCryptorankConfigured,
  SPARKLINE_RANGES,
  type SparklineRange,
} from '@/lib/api/cryptorank';
import { CACHE_SHORT } from '@/lib/config';

/**
 * Sparkline proxy. The chart island calls this with `?id=<cryptorankId>&range=<…>`
 * when the user clicks a different timeframe button. We deliberately don't
 * accept the upstream URL or full param set — only the IDs we know about
 * (positive integer) and the small enum of ranges, so the route can never
 * be turned into an open proxy.
 *
 * Returns 404 when the upstream isn't configured (TradingView fallback
 * runs in that case) or 200 with `{ values: SparklinePoint[] }` on
 * success / `{ values: null }` on a soft upstream failure (the client
 * surface treats both as "show fallback").
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCryptorankConfigured()) {
    return NextResponse.json({ error: 'cryptorank not configured' }, { status: 404 });
  }

  const id = Number(req.nextUrl.searchParams.get('id'));
  const range = req.nextUrl.searchParams.get('range') as SparklineRange | null;

  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  if (!range || !SPARKLINE_RANGES.includes(range)) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 });
  }

  const values = await getSparkline(id, range);
  return NextResponse.json(
    { values },
    {
      headers: {
        // Short edge cache so the route survives a refresh storm; the
        // upstream cache (in `lib/api/cryptorank`) is what actually
        // protects the API budget.
        'Cache-Control': `public, s-maxage=${CACHE_SHORT}, stale-while-revalidate=120`,
      },
    },
  );
}
