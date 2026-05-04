import { NextResponse } from 'next/server';

import { getNowUsdPrice } from '@/lib/api/currencies';

// Server-side proxy for the ChangeNOW estimate API. Uses the public
// `vip-api.changenow.io/v1.3/exchange/estimate` endpoint — no API key, full
// support for fixed-rate, reverse, networks, promoCode. Same source the prod
// site SPA uses.
//
// Why proxy and not call directly from the client:
//   - Centralizes the param contract — the browser hook just sends our app's
//     own shape and we map to upstream.
//   - Lets us short-edge-cache estimates (15s) so multiple visitors quoting
//     the same pair don't each spam the upstream.
//   - Gives us a place to apply input validation, rate limiting, and timeouts
//     before reaching the upstream.

const ESTIMATES_HOST =
  process.env.ESTIMATES_API_BASEURL ?? 'https://vip-api.bento.capital';

// Trust the first `x-forwarded-for` hop only if explicitly told that we sit
// behind a known proxy chain — the public web request cannot be trusted to
// supply this header honestly. When unset, the upstream sees our origin's IP.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

// Upstream call budget. The estimate endpoint usually responds in < 1s — give
// it 5s and bail; the homepage shows a "try again" hint rather than holding
// the connection open.
const UPSTREAM_TIMEOUT_MS = 5_000;

// Per-IP rate limit: a simple token bucket in process memory. This is a
// soft floor — multi-instance deployments should layer a shared limiter
// (Redis/edge KV) in front. The local bucket is enough to catch a single
// runaway client (loop/refresh storm) while staying free of dependencies.
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 30;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const bucket = ipBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
};

// In-flight dedupe — collapse identical concurrent estimates to a single
// upstream round-trip. Different from the edge cache (which works between
// requests): this protects bursts that arrive before the first response
// lands.
const inflight = new Map<string, Promise<{ status: number; body: unknown }>>();

interface UpstreamProvider {
  id: string;
  type: string;
  label: string;
  isAllowed: boolean;
  isConvertible: boolean;
  isAmountInRange: boolean;
  estimatedAmount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  custom: {
    flow: 'standard' | 'fixed-rate';
    type: 'direct' | 'reverse';
    rateId: string | null;
    transactionSpeedForecast: string | null;
    validUntil: string | null;
    warningMessage: string | null;
    withdrawalFee: number | null;
    depositFee: number | null;
  };
  // Extra amount the user would receive on a Pro account (denominated in TO
  // for direct estimates, FROM for reverse). Comes back as a string from the
  // upstream — parse on normalize.
  cashback?: string | number | null;
  // The upstream sometimes ships a structured error here (`{ code, message }`,
  // a wrapped error envelope, etc.) instead of a plain string — type as
  // `unknown` so the normalize step is forced to coerce.
  error: unknown;
}

interface UpstreamSummary {
  estimatedAmount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  estimationFrom?: string | null;
  estimationFromLabel?: string | null;
}

interface UpstreamResponse {
  summary: UpstreamSummary;
  providers: UpstreamProvider[];
}

/**
 * Slim provider entry — what the picker on the homepage actually uses.
 * Drops the upstream fields we don't render (priority, rateId, custom flow).
 */
export interface EstimateProvider {
  /** Lowercase brand id ("guardarian", "banxa", "transak"). */
  type: string;
  /** Display name ("Guardarian"). */
  label: string;
  /** TO amount this provider quotes — used to rank against the recommended one. */
  estimatedAmount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  /** True when the upstream picked this provider as the recommended option. */
  isRecommended: boolean;
}

interface NormalizedEstimate {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number | null;
  flow: 'standard' | 'fixed-rate';
  type: 'direct' | 'reverse';
  rateId: string | null;
  validUntil: string | null;
  transactionSpeedForecast: string | null;
  warningMessage: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  /**
   * False when the user-supplied amount is below `minAmount` or above
   * `maxAmount`. Lets the client render a "Min: X" / "Max: X" hint with
   * the actual boundary value rather than just a generic error.
   */
  isAmountInRange: boolean;
  /** Network fee charged on the destination chain, denominated in `toCurrency`. */
  withdrawalFee: number | null;
  /** Network fee charged on the source chain, denominated in `fromCurrency`. */
  depositFee: number | null;
  /**
   * Pro-account spread bonus, denominated in USD. Computed server-side
   * from the dedicated `/v1/cashback/estimate` endpoint (returns the
   * cashback in NOW token) multiplied by the cached NOW→USD price from
   * the currencies catalog. `null` when either lookup fails or the pair
   * has no benefit; `0` when the upstream returns an empty cashback.
   */
  cashbackUsd: number | null;
  /**
   * Available providers for this pair, in upstream-priority order. Empty for
   * crypto-crypto pairs (a single in-house provider). Populated for fiat
   * pairs where multiple on-ramps compete.
   */
  providers: EstimateProvider[];
}

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Coerce whatever the upstream put on `provider.error` into a flat string
 * suitable for surfacing through our API and rendering in the UI. Falls
 * through a few common envelope shapes before giving up to a generic label.
 */
const stringifyUpstreamError = (raw: unknown): string => {
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    const r = raw as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof r.message === 'string' && r.message.trim()) return r.message;
    if (typeof r.error === 'string' && r.error.trim()) return r.error;
    if (typeof r.code === 'string' && r.code.trim()) return r.code;
  }
  return 'Estimate unavailable';
};

// Allowed-character set for currency tickers and network codes. Tight enough
// to reject path/query injection attempts (slashes, `%`, `..`) without
// hardcoding the full ticker list, which the upstream owns.
const TICKER_RE = /^[a-z0-9]{1,16}$/;
// Promo/link codes accept a wider set but stay short; same idea.
const CODE_RE = /^[A-Za-z0-9_.-]{1,64}$/;
// Sanity bound for amounts. The upstream rejects anything outside its own
// per-pair range with a structured error, but we still want a hard ceiling
// so a 1e308 input doesn't even reach the upstream.
const MAX_AMOUNT = 1e12;

const parseAmount = (raw: string | null): number | null | undefined => {
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null;
  return n;
};

interface ValidatedParams {
  from: string;
  to: string;
  fromNetwork: string;
  toNetwork: string;
  fromAmount: number | undefined;
  toAmount: number | undefined;
  flow: 'standard' | 'fixed-rate';
  type: 'direct' | 'reverse';
  promoCode: string;
  linkId: string;
  useRateId: 'true' | 'false';
}

const validate = (
  url: URL,
): { ok: true; params: ValidatedParams } | { ok: false; message: string } => {
  const from = (url.searchParams.get('from') ?? '').toLowerCase();
  const to = (url.searchParams.get('to') ?? '').toLowerCase();
  const fromNetwork = (url.searchParams.get('fromNetwork') ?? from).toLowerCase();
  const toNetwork = (url.searchParams.get('toNetwork') ?? to).toLowerCase();
  const flowRaw = url.searchParams.get('flow') ?? 'standard';
  const typeRaw = url.searchParams.get('type') ?? 'direct';
  const promoCode = url.searchParams.get('promoCode') ?? '';
  const linkId = url.searchParams.get('linkId') ?? '';
  const useRateIdRaw = url.searchParams.get('useRateId') ?? 'false';

  if (!TICKER_RE.test(from)) return { ok: false, message: 'invalid from' };
  if (!TICKER_RE.test(to)) return { ok: false, message: 'invalid to' };
  if (!TICKER_RE.test(fromNetwork)) return { ok: false, message: 'invalid fromNetwork' };
  if (!TICKER_RE.test(toNetwork)) return { ok: false, message: 'invalid toNetwork' };
  // Same-asset same-network is the private-transfer path; the upstream
  // accepts it when `useRateId=true` + `source=private-transfers` (set
  // by `buildUpstreamUrl` below) and quotes a real fixed-rate fee.

  if (flowRaw !== 'standard' && flowRaw !== 'fixed-rate') {
    return { ok: false, message: 'invalid flow' };
  }
  if (typeRaw !== 'direct' && typeRaw !== 'reverse') {
    return { ok: false, message: 'invalid type' };
  }

  if (promoCode && !CODE_RE.test(promoCode)) {
    return { ok: false, message: 'invalid promoCode' };
  }
  if (linkId && !CODE_RE.test(linkId)) {
    return { ok: false, message: 'invalid linkId' };
  }
  if (useRateIdRaw !== 'true' && useRateIdRaw !== 'false') {
    return { ok: false, message: 'invalid useRateId' };
  }

  const fromAmount = parseAmount(url.searchParams.get('fromAmount'));
  const toAmount = parseAmount(url.searchParams.get('toAmount'));
  if (fromAmount === null) return { ok: false, message: 'invalid fromAmount' };
  if (toAmount === null) return { ok: false, message: 'invalid toAmount' };
  if (typeRaw === 'direct' && fromAmount == null) {
    return { ok: false, message: 'fromAmount required for direct' };
  }
  if (typeRaw === 'reverse' && toAmount == null) {
    return { ok: false, message: 'toAmount required for reverse' };
  }

  return {
    ok: true,
    params: {
      from,
      to,
      fromNetwork,
      toNetwork,
      fromAmount,
      toAmount,
      flow: flowRaw,
      type: typeRaw,
      promoCode,
      linkId,
      useRateId: useRateIdRaw,
    },
  };
};

/**
 * Resolve the client IP from a trusted proxy header. Returns `null` when
 * there is no platform-trusted source — the upstream then sees the request
 * coming from our origin, which is the safe default. We do not honor a
 * client-supplied `x-forwarded-for` outside `TRUST_PROXY=true` because that
 * header is freely settable by the public web client.
 */
const trustedClientIp = (req: Request): string | null => {
  // Headers populated by known reverse proxies (Cloudflare, Akamai, Fastly,
  // Vercel, etc.) — these arrive over a private link and the public client
  // cannot inject them.
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const trueClient = req.headers.get('true-client-ip');
  if (trueClient) return trueClient;
  if (TRUST_PROXY) {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
    const real = req.headers.get('x-real-ip');
    if (real) return real;
  }
  return null;
};

/** Cheap key for rate-limiting / dedupe when no platform IP is available. */
const limiterKey = (req: Request): string =>
  trustedClientIp(req) ?? 'origin';

const buildUpstreamUrl = (path: string, p: ValidatedParams): URL => {
  const u = new URL(path, ESTIMATES_HOST);
  u.searchParams.set('fromCurrency', p.from);
  u.searchParams.set('fromNetwork', p.fromNetwork);
  u.searchParams.set('toCurrency', p.to);
  u.searchParams.set('toNetwork', p.toNetwork);
  u.searchParams.set('type', p.type);
  u.searchParams.set('flow', p.flow);
  // Same ticker on the same network = private transfer. Mirror the
  // legacy `/private-transfers` SPA's `source=private-transfers`
  // attribution so the upstream's same-asset path returns a real
  // fixed-rate fee instead of HTTP 500. Cross-network same-ticker
  // (USDT-TRX → USDT-ETH) and crypto-crypto pairs go through the
  // standard `site` source.
  const isPrivateTransfer = p.from === p.to && p.fromNetwork === p.toNetwork;
  u.searchParams.set('source', isPrivateTransfer ? 'private-transfers' : 'site');
  if (p.type === 'direct' && p.fromAmount != null) {
    u.searchParams.set('fromAmount', String(p.fromAmount));
  }
  if (p.type === 'reverse' && p.toAmount != null) {
    u.searchParams.set('toAmount', String(p.toAmount));
  }
  if (p.promoCode) u.searchParams.set('promoCode', p.promoCode);
  if (p.linkId) u.searchParams.set('linkId', p.linkId);
  if (p.flow === 'fixed-rate') u.searchParams.set('useRateId', p.useRateId);
  return u;
};

const dedupeKey = (p: ValidatedParams): string =>
  [
    p.from,
    p.fromNetwork,
    p.to,
    p.toNetwork,
    p.type,
    p.flow,
    p.fromAmount ?? '',
    p.toAmount ?? '',
    p.promoCode,
    p.linkId,
    p.useRateId,
  ].join('|');

const runEstimate = async (
  p: ValidatedParams,
  reqSignal: AbortSignal,
  ip: string | null,
): Promise<{ status: number; body: unknown }> => {
  const upstream = buildUpstreamUrl('/v1.3/exchange/estimate', p);

  // Cashback is fetched from a separate endpoint (`/v1/cashback/estimate`)
  // that returns the value in NOW token. Run it in parallel with the main
  // estimate so the round-trip stays single-flight from the client's
  // perspective. Failures here are non-fatal — the Pro upsell just hides.
  const cashbackUrl = buildUpstreamUrl('/v1/cashback/estimate', p);

  const headers: HeadersInit = { Accept: 'application/json' };
  // Only forward an IP we trust. When `TRUST_PROXY` is off (default) and no
  // platform header was set, leave it to the upstream to see our origin.
  if (ip) headers['x-forwarded-for'] = ip;

  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const signal = AbortSignal.any ? AbortSignal.any([reqSignal, timeout]) : reqSignal;

  let res: Response;
  let cashbackRes: Response | null = null;
  let nowUsdPrice: number | null = null;
  try {
    [res, cashbackRes, nowUsdPrice] = await Promise.all([
      fetch(upstream.toString(), { method: 'GET', headers, signal, cache: 'no-store' }),
      fetch(cashbackUrl.toString(), {
        method: 'GET',
        headers,
        signal,
        cache: 'no-store',
      }).catch(() => null),
      getNowUsdPrice().catch(() => null),
    ]);
  } catch {
    return {
      status: 502,
      body: { error: 'upstream_unreachable', message: 'Estimate service unavailable' },
    };
  }

  const data = (await res.json().catch(() => null)) as UpstreamResponse | null;
  if (!res.ok || !data || !Array.isArray(data.providers)) {
    return {
      status: 502,
      body: { error: 'upstream_failure', message: `Upstream HTTP ${res.status}` },
    };
  }

  const provider =
    data.providers.find((pr) => pr.isAllowed && pr.estimatedAmount != null) ??
    data.providers[0];
  if (!provider) {
    return {
      status: 502,
      body: { error: 'no_providers', message: 'No estimate provider available' },
    };
  }
  if (provider.error) {
    const msg = stringifyUpstreamError(provider.error);
    return { status: 422, body: { error: 'provider_error', message: msg } };
  }

  const estimated = toNumber(provider.estimatedAmount);
  const fromAmt = p.type === 'direct' ? (p.fromAmount ?? 0) : (estimated ?? 0);
  const toAmt = p.type === 'direct' ? estimated : (p.toAmount ?? null);

  const recommendedType = (data.summary?.estimationFrom ?? '').toLowerCase();
  const providers: EstimateProvider[] = data.providers
    .filter((pr) => pr.isAllowed && pr.estimatedAmount != null)
    .map((pr) => ({
      type: (pr.type ?? '').toLowerCase(),
      label: pr.label ?? pr.type ?? '',
      estimatedAmount: toNumber(pr.estimatedAmount),
      minAmount: toNumber(pr.minAmount),
      maxAmount: toNumber(pr.maxAmount),
      isRecommended:
        !!recommendedType && (pr.type ?? '').toLowerCase() === recommendedType,
    }));

  let cashbackUsd: number | null = null;
  if (cashbackRes && cashbackRes.ok && nowUsdPrice && nowUsdPrice > 0) {
    const body = (await cashbackRes.json().catch(() => null)) as
      | { cashback?: unknown }
      | null;
    const cashbackNow = toNumber(body?.cashback);
    if (cashbackNow != null && cashbackNow > 0) {
      cashbackUsd = cashbackNow * nowUsdPrice;
    } else if (cashbackNow === 0) {
      cashbackUsd = 0;
    }
  }

  const normalized: NormalizedEstimate = {
    fromCurrency: p.from,
    toCurrency: p.to,
    fromAmount: fromAmt,
    toAmount: toAmt,
    flow: provider.custom.flow,
    type: provider.custom.type,
    rateId: provider.custom.rateId,
    validUntil: provider.custom.validUntil,
    transactionSpeedForecast: provider.custom.transactionSpeedForecast,
    warningMessage: provider.custom.warningMessage,
    minAmount: toNumber(provider.minAmount),
    maxAmount: toNumber(provider.maxAmount),
    isAmountInRange: provider.isAmountInRange !== false,
    withdrawalFee: toNumber(provider.custom.withdrawalFee),
    depositFee: toNumber(provider.custom.depositFee),
    cashbackUsd,
    providers,
  };

  return { status: 200, body: normalized };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const v = validate(url);
  if (!v.ok) {
    return NextResponse.json({ error: 'bad_request', message: v.message }, { status: 400 });
  }

  const key = limiterKey(req);
  if (!checkRateLimit(key)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '10' } },
    );
  }

  const ip = trustedClientIp(req);
  const dKey = dedupeKey(v.params);
  let pending = inflight.get(dKey);
  if (!pending) {
    pending = runEstimate(v.params, req.signal, ip).finally(() => {
      // Hold the in-flight slot only until the upstream resolves; the edge
      // cache below covers the next 15s.
      inflight.delete(dKey);
    });
    inflight.set(dKey, pending);
  }
  const { status, body } = await pending;

  return NextResponse.json(body, {
    status,
    headers:
      status === 200
        ? {
            // Estimates are valid for ~60s, but rates drift in seconds. A 15s
            // edge cache smooths bursty pages while staying inside the rate's
            // own freshness window.
            'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
          }
        : { 'Cache-Control': 'no-store' },
  });
}
