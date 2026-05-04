import { NextResponse } from 'next/server';

// Server-side proxy for the ChangeNOW transaction-create API. POSTs to the
// public `vip-api.changenow.io/v1.1/transactions` endpoint — same source
// the legacy SPA's `/private-transfers` flow uses, no API key required.
// We force `provider: 'default'` and `source: 'private-transfers'` here
// so the browser can't escalate to an unrelated provider attribution.

const VIP_API = process.env.ESTIMATES_API_BASEURL ?? 'https://vip-api.bento.capital';

// Tight allowlist for tickers + networks — same regex `app/api/estimate`
// uses, so currency parameters can't sneak path/query characters into the
// upstream URL when we forward.
const TICKER_RE = /^[a-z0-9]{1,16}$/;
// Address + extra-id allowlist — generous enough for every chain's
// canonical format (Tron base58, Bitcoin base58/bech32, Ethereum hex,
// XRP r-prefix, Cosmos bech32, Solana base58 …) but blocks shell
// metacharacters and JSON-injection attempts. Per-chain shape is
// validated client-side via the catalog regex; the upstream does the
// final strict check before issuing the deposit address.
const ADDRESS_RE = /^[A-Za-z0-9_:.\-]{6,200}$/;
const EXTRA_ID_RE = /^[A-Za-z0-9_\-:.]{1,128}$/;
// `rateId` is the upstream-issued opaque token from a fixed-rate
// estimate quote. We don't decode it, just forward — but bound the
// length and character set so a malformed value can't slip through
// as an injection vector.
const RATE_ID_RE = /^[A-Za-z0-9_+/=\-]{16,512}$/;

const MAX_AMOUNT = 1e12;

const toAmount = (raw: unknown): number | null | undefined => {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null;
  return n;
};

interface UpstreamResponse {
  id?: string;
  payinAddress?: string;
  payoutAddress?: string;
  fromAmount?: number;
  toAmount?: number;
  flow?: string;
  type?: string;
  validUntil?: string;
  fromCurrency?: string;
  toCurrency?: string;
  fromNetwork?: string;
  toNetwork?: string;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'bad_request', message: 'Invalid JSON' },
      { status: 400 },
    );
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'bad_request', message: 'Invalid body' },
      { status: 400 },
    );
  }

  const b = body as Record<string, unknown>;

  const fromCurrency = String(b.fromCurrency ?? '').toLowerCase();
  const toCurrency = String(b.toCurrency ?? '').toLowerCase();
  const fromNetwork = String(b.fromNetwork ?? '').toLowerCase();
  const toNetwork = String(b.toNetwork ?? '').toLowerCase();
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const extraId = typeof b.extraId === 'string' ? b.extraId.trim() : '';

  if (!TICKER_RE.test(fromCurrency)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid fromCurrency' },
      { status: 400 },
    );
  }
  if (!TICKER_RE.test(toCurrency)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid toCurrency' },
      { status: 400 },
    );
  }
  if (!TICKER_RE.test(fromNetwork)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid fromNetwork' },
      { status: 400 },
    );
  }
  if (!TICKER_RE.test(toNetwork)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid toNetwork' },
      { status: 400 },
    );
  }
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid address' },
      { status: 400 },
    );
  }
  if (extraId && !EXTRA_ID_RE.test(extraId)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid extraId' },
      { status: 400 },
    );
  }

  const fromAmount = toAmount(b.fromAmount);
  const recipientAmount = toAmount(b.toAmount);
  if (fromAmount === null) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid fromAmount' },
      { status: 400 },
    );
  }
  if (recipientAmount === null) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid toAmount' },
      { status: 400 },
    );
  }
  if (fromAmount == null && recipientAmount == null) {
    return NextResponse.json(
      { error: 'bad_request', message: 'fromAmount or toAmount required' },
      { status: 400 },
    );
  }

  const flowRaw = typeof b.flow === 'string' ? b.flow : 'standard';
  if (flowRaw !== 'standard' && flowRaw !== 'fixed-rate') {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid flow' },
      { status: 400 },
    );
  }
  const typeRaw = typeof b.type === 'string' ? b.type : undefined;
  if (typeRaw && typeRaw !== 'direct' && typeRaw !== 'reverse') {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid type' },
      { status: 400 },
    );
  }
  const rateId = typeof b.rateId === 'string' ? b.rateId : '';
  if (flowRaw === 'fixed-rate' && !rateId) {
    return NextResponse.json(
      { error: 'bad_request', message: 'rateId required for fixed-rate' },
      { status: 400 },
    );
  }
  if (rateId && !RATE_ID_RE.test(rateId)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'invalid rateId' },
      { status: 400 },
    );
  }

  // Forward to the upstream. The endpoint accepts same-asset ("private
  // transfer") submissions when `provider=default` and
  // `source=private-transfers`. Fixed-rate flow needs `rateId` (issued
  // by `/api/estimate` with `useRateId=true`), and `type` is the side
  // the user typed — the upstream uses both to settle the counterpart
  // at the quoted rate.
  const payload: Record<string, unknown> = {
    provider: 'default',
    fromCurrency,
    toCurrency,
    fromNetwork,
    toNetwork,
    address,
    source: 'private-transfers',
    flow: flowRaw,
  };
  if (typeRaw) payload.type = typeRaw;
  if (rateId) payload.rateId = rateId;
  if (fromAmount != null) payload.fromAmount = fromAmount;
  if (recipientAmount != null) payload.toAmount = recipientAmount;
  if (extraId) payload.extraId = extraId;

  const upstreamUrl = `${VIP_API.replace(/\/$/, '')}/v1.1/transactions`;
  const timeout = AbortSignal.timeout(8_000);
  let res: Response;
  try {
    res = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: timeout,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: 'upstream_unreachable', message: 'Service unavailable' },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => null)) as UpstreamResponse | null;
  if (!res.ok || !data) {
    const message =
      data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Upstream HTTP ${res.status}`;
    return NextResponse.json(
      { error: 'upstream_failure', message },
      { status: res.status >= 400 && res.status < 500 ? res.status : 502 },
    );
  }
  if (!data.id) {
    return NextResponse.json(
      { error: 'upstream_failure', message: 'Missing transaction id' },
      { status: 502 },
    );
  }

  // Slim the response — the homepage only needs the id (to redirect) and
  // a few convenience fields for an optional "deposit info" splash if
  // we ever inline the next step instead of redirecting to legacy.
  return NextResponse.json(
    {
      id: data.id,
      payinAddress: data.payinAddress ?? null,
      payoutAddress: data.payoutAddress ?? null,
      fromAmount: data.fromAmount ?? null,
      toAmount: data.toAmount ?? null,
      validUntil: data.validUntil ?? null,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
