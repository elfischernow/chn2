import { NextResponse, type NextRequest } from 'next/server';

import { gateMocks } from '../../../_shared';

export const dynamic = 'force-dynamic';

/**
 * Mock vip-api `/v1/cashback/estimate`. Real upstream returns a
 * `{ amount, currency }` envelope; we return a 0.25% cashback on the
 * `fromAmount` query in NOW, which the calculator's cashback overlay
 * displays as "Pro bonus". Enough to verify the badge renders without
 * hitting the real cashback service.
 */
export async function GET(req: NextRequest) {
  const gate = gateMocks();
  if (gate) return gate;

  const fromAmount = Number(req.nextUrl.searchParams.get('fromAmount') ?? '0');
  const amount = Number.isFinite(fromAmount) ? fromAmount * 0.0025 : 0;
  return NextResponse.json({
    amount: amount > 0 ? amount.toFixed(4) : '0',
    currency: 'now',
  });
}
