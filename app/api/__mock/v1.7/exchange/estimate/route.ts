import { NextResponse, type NextRequest } from 'next/server';

import { gateMocks } from '../../../_shared';

// `force-dynamic` because the response depends on request query params
// (`fromCurrency`, `fromAmount`, …) — Next would otherwise try to ISR this.
export const dynamic = 'force-dynamic';

/**
 * Mock vip-api `/v1.7/exchange/estimate`. Returns a single allowed provider
 * with a plausible estimated amount derived from `fromAmount` so the
 * calculator skeleton + cashback overlay render with non-zero numbers.
 *
 * Math is intentionally trivial — `toAmount = fromAmount * 0.98` plus a
 * fixed rate placeholder. The estimate shape mirrors the real upstream
 * just enough to keep `lib/api/exchange.ts` happy (provider list with one
 * allowed entry, summary block with min/max/estimated).
 */
export async function GET(req: NextRequest) {
  const gate = gateMocks();
  if (gate) return gate;

  const sp = req.nextUrl.searchParams;
  const from = (sp.get('fromCurrency') ?? 'btc').toLowerCase();
  const to = (sp.get('toCurrency') ?? 'eth').toLowerCase();
  const fromAmount = Number(sp.get('fromAmount') ?? '1');
  const direction = sp.get('type') ?? 'direct';
  const flow = sp.get('flow') ?? 'standard';

  // Stable per-pair pseudo-rate so the calculator doesn't shimmer between
  // renders. Derived from the lowercase concatenation hash, scaled into a
  // sensible band (0.5 – 50,000) so BTC↔fiat pairs still look plausible.
  const pseudoRate = ((): number => {
    let h = 2166136261;
    for (const ch of `${from}|${to}`) {
      h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    }
    const seed = (h >>> 0) / 0xffffffff;
    return 0.5 + seed * 50000;
  })();

  const estimated = Number.isFinite(fromAmount)
    ? Math.max(0, fromAmount * pseudoRate * 0.98)
    : 0;

  const provider = {
    id: 'mock-provider',
    type: 'mock',
    label: 'Mock Provider',
    isAllowed: true,
    isConvertible: true,
    isAmountInRange: true,
    estimatedAmount: direction === 'reverse' ? fromAmount : estimated,
    minAmount: 0.0001,
    maxAmount: 1_000_000,
    custom: {
      flow,
      type: direction,
      rateId: 'mock-rate',
      transactionSpeedForecast: '<5 min',
      validUntil: new Date(Date.now() + 5 * 60_000).toISOString(),
      warningMessage: null,
      withdrawalFee: 0,
      depositFee: 0,
    },
    cashback: null,
    isHighNetworkFee: false,
    error: null,
  };

  return NextResponse.json({
    summary: {
      estimatedAmount: estimated,
      minAmount: provider.minAmount,
      maxAmount: provider.maxAmount,
      estimationFrom: 'mock-provider',
      estimationFromLabel: 'Mock Provider',
      isHighNetworkFee: false,
    },
    providers: [provider],
  });
}
