import { NextResponse, type NextRequest } from 'next/server';

import { gateMocks, readState } from '../../../_shared';

export const dynamic = 'force-dynamic';

/**
 * Mock vip-api `/v1.1/transactions`. POST creates a tx (we just echo back
 * a synthetic id + 200); GET returns a small history when the mock cookie
 * says `valid`, an empty list otherwise.
 *
 * The legacy upstream returns `{ data: [...] }` for GETs (paginated) and a
 * single tx envelope for POSTs. We mirror that shape so calling code in
 * `lib/api/exchange.ts` doesn't need a mock-aware branch.
 */
const SAMPLE_TXS = [
  {
    id: 'mock-tx-1',
    fromCurrency: 'btc',
    toCurrency: 'eth',
    fromAmount: 0.1,
    toAmount: 1.45,
    status: 'finished',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'mock-tx-2',
    fromCurrency: 'usdt',
    toCurrency: 'sol',
    fromAmount: 200,
    toAmount: 1.32,
    status: 'finished',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

export async function GET() {
  const gate = gateMocks();
  if (gate) return gate;
  const state = await readState();
  return NextResponse.json({ data: state === 'valid' ? SAMPLE_TXS : [] });
}

export async function POST(req: NextRequest) {
  const gate = gateMocks();
  if (gate) return gate;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // `crypto.randomUUID` is available in the edge runtime + Node 16+, no
  // explicit polyfill needed inside Next route handlers.
  const id = `mock-${crypto.randomUUID()}`;
  return NextResponse.json({
    id,
    fromCurrency: body.fromCurrency ?? 'btc',
    toCurrency: body.toCurrency ?? 'eth',
    fromAmount: body.fromAmount ?? 0,
    toAmount: body.toAmount ?? 0,
    status: 'waiting',
    payinAddress: 'mock-payin-address',
    createdAt: new Date().toISOString(),
  });
}
