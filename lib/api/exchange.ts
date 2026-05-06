// Browser-side API for the calculator. Talks directly to vip-api — no Next
// proxy in front, so we only have one network hop and one place to harden.
//
// Why direct: the proxy was a point of failure (extra hop, separate timeout,
// rate limit, edge cache window all stacked on top of the upstream's own
// behavior). The upstream is publicly reachable from the browser already
// (the legacy SPA calls it the same way via axios with `withCredentials`),
// so we just inline the call and the response normalization.

import { SITE_URL, VIP_API_BASE } from '@/lib/config';

import { getNowUsdPriceClient } from './now-price.client';

export type RateFlow = 'standard' | 'fixed-rate';
export type EstimateType = 'direct' | 'reverse';

export interface EstimateRequest {
  from: string;
  to: string;
  /** Network for `from`. Defaults to the lowercase ticker — fine for
   *  single-network coins (BTC, ETH); required for multi-network ones
   *  (USDT/TRC20, USDT/ERC20, …) where the ticker alone is ambiguous. */
  fromNetwork?: string;
  toNetwork?: string;
  fromAmount?: string | number;
  toAmount?: string | number;
  flow?: RateFlow;
  type?: EstimateType;
  signal?: AbortSignal;
}

/** A single on-ramp provider quoted for the current pair. */
export interface EstimateProvider {
  /** Lowercase brand id (`'guardarian'`, `'banxa'`, …). */
  type: string;
  /** Display name. */
  label: string;
  estimatedAmount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  /** Marked by the upstream as the default pick for this pair. */
  isRecommended: boolean;
}

export interface EstimateResponse {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number | null;
  flow: RateFlow;
  type: EstimateType;
  rateId: string | null;
  validUntil: string | null;
  transactionSpeedForecast: string | null;
  warningMessage: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  /**
   * False when the user's amount is outside `[minAmount, maxAmount]`. Lets
   * the client offer a one-tap "use min" / "use max" affordance instead
   * of just an opaque error.
   */
  isAmountInRange: boolean;
  withdrawalFee: number | null;
  depositFee: number | null;
  /**
   * Extra amount a Pro user would receive, in USD. Derived from the
   * cashback API (returns NOW token) × cached NOW→USD price. `null` when
   * either lookup fails; `0` when the pair offers no benefit.
   */
  cashbackUsd: number | null;
  /** Available providers (fiat on-ramps). Empty for crypto-crypto pairs. */
  providers: EstimateProvider[];
}

export interface EstimateError {
  error: string;
  message: string;
}

// ─── Upstream shapes (vip-api `/v1.3/exchange/estimate`) ───────────────────

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
    flow: RateFlow;
    type: EstimateType;
    rateId: string | null;
    transactionSpeedForecast: string | null;
    validUntil: string | null;
    warningMessage: string | null;
    withdrawalFee: number | null;
    depositFee: number | null;
  };
  cashback?: string | number | null;
  // Sometimes a structured envelope, sometimes a plain string.
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

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

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

const buildUpstreamUrl = (path: string, req: EstimateRequest): URL => {
  const u = new URL(path, VIP_API_BASE);
  const from = req.from.toLowerCase();
  const to = req.to.toLowerCase();
  const fromNetwork = (req.fromNetwork ?? from).toLowerCase();
  const toNetwork = (req.toNetwork ?? to).toLowerCase();
  const flow: RateFlow = req.flow ?? 'standard';
  const type: EstimateType = req.type ?? 'direct';

  u.searchParams.set('fromCurrency', from);
  u.searchParams.set('fromNetwork', fromNetwork);
  u.searchParams.set('toCurrency', to);
  u.searchParams.set('toNetwork', toNetwork);
  u.searchParams.set('type', type);
  u.searchParams.set('flow', flow);
  // Same ticker on the same network = private transfer. Mirror the legacy
  // `/private-transfers` SPA's `source=private-transfers` so the upstream's
  // same-asset path quotes a real fixed-rate fee. Cross-network same-ticker
  // (USDT-TRX → USDT-ETH) and crypto-crypto pairs go through `site`.
  const isPrivateTransfer = from === to && fromNetwork === toNetwork;
  u.searchParams.set('source', isPrivateTransfer ? 'private-transfers' : 'site');
  if (type === 'direct' && req.fromAmount != null) {
    u.searchParams.set('fromAmount', String(req.fromAmount));
  }
  if (type === 'reverse' && req.toAmount != null) {
    u.searchParams.set('toAmount', String(req.toAmount));
  }
  // `useRateId=true` is required for fixed-rate quotes — without it the
  // upstream returns a price snapshot but no `rateId`, so we couldn't bind
  // it to a transaction at submit time. Same flag unlocks the same-asset
  // (private-transfer) path.
  if (flow === 'fixed-rate') u.searchParams.set('useRateId', 'true');
  return u;
};

export async function fetchEstimate(req: EstimateRequest): Promise<EstimateResponse> {
  const type: EstimateType = req.type ?? 'direct';
  const from = req.from.toLowerCase();
  const to = req.to.toLowerCase();

  if (type === 'direct' && req.fromAmount == null) {
    throw { error: 'bad_request', message: 'fromAmount required for direct' };
  }
  if (type === 'reverse' && req.toAmount == null) {
    throw { error: 'bad_request', message: 'toAmount required for reverse' };
  }

  // v1.7 is the current version the legacy SPA hits (see
  // legacy-projects/changenow-frontend/src/react-ssr/api/modules/dashboard/
  // use-dashboard-next-exchange-estimate.js). Same `{ summary, providers }`
  // response envelope as v1.3 — we keep our normalize step intact and only
  // bump the path. Promo / link / source / useRateId query params are still
  // accepted, so the same `buildUpstreamUrl` shape works.
  const upstream = buildUpstreamUrl('/v1.7/exchange/estimate', req);
  // Cashback is a separate endpoint that returns the value in NOW token.
  // Run in parallel with the estimate so the round-trip stays single-flight
  // from the calculator's perspective. Failures are non-fatal — the Pro
  // upsell just hides.
  const cashbackUrl = buildUpstreamUrl('/v1/cashback/estimate', req);

  let res: Response;
  let cashbackRes: Response | null = null;
  let nowUsdPrice: number | null = null;
  try {
    [res, cashbackRes, nowUsdPrice] = await Promise.all([
      fetch(upstream.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: req.signal,
        cache: 'no-store',
      }),
      fetch(cashbackUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: req.signal,
        cache: 'no-store',
      }).catch(() => null),
      getNowUsdPriceClient(req.signal).catch(() => null),
    ]);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw {
      error: 'upstream_unreachable',
      message: 'Estimate service unavailable',
    } as EstimateError;
  }

  const data = (await res.json().catch(() => null)) as UpstreamResponse | null;
  if (!res.ok || !data || !Array.isArray(data.providers)) {
    throw {
      error: 'upstream_failure',
      message: `Upstream HTTP ${res.status}`,
    } as EstimateError;
  }

  const provider =
    data.providers.find((pr) => pr.isAllowed && pr.estimatedAmount != null) ??
    data.providers[0];
  if (!provider) {
    throw {
      error: 'no_providers',
      message: 'No estimate provider available',
    } as EstimateError;
  }
  if (provider.error) {
    throw {
      error: 'provider_error',
      message: stringifyUpstreamError(provider.error),
    } as EstimateError;
  }

  const estimated = toNumber(provider.estimatedAmount);
  const fromAmt =
    type === 'direct'
      ? Number(req.fromAmount) || 0
      : (estimated ?? 0);
  const toAmt = type === 'direct' ? estimated : (Number(req.toAmount) || null);

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

  return {
    fromCurrency: from,
    toCurrency: to,
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
}

// ─── Transaction creation ──────────────────────────────────────────────────

export interface CreateTransactionRequest {
  fromCurrency: string;
  toCurrency: string;
  fromNetwork: string;
  toNetwork: string;
  /** Recipient (payout) wallet. Empty string for fiat-out flows where the
   *  user gets paid to bank, not chain. */
  address: string;
  /** Memo / destination tag for chains that need it. */
  extraId?: string;
  /** Refund address — for anonymous-from currencies the upstream insists. */
  refundAddress?: string;
  /** Pricing flow chosen by the user. Defaults to `'standard'`. */
  flow?: RateFlow;
  /** Side the user typed; the upstream settles the counterpart at the rate. */
  type?: EstimateType;
  fromAmount?: string | number;
  toAmount?: string | number;
  /** Required for `flow === 'fixed-rate'`. Issued by `fetchEstimate`. */
  rateId?: string;
  /** Provider override. Defaults to the upstream's recommended pick. */
  provider?: string;
  /** Promo code (validated server-side). */
  promoCode?: string;
  /** `'site'`, `'private-transfers'`, `'fiat'`, `'tg_app'`, `'bridge'`. */
  source?: string;
  /** Required for fiat flows the dashboard tracks against the user. */
  userId?: string;
  /** Sub-affiliation token. */
  linkId?: string;
  /** Misc UTM/landing tracking. */
  info?: Record<string, unknown>;
  /** When `true`, sends `credentials: 'include'` so the upstream's session
   *  cookie travels with the request. Required for authed flows that bind
   *  the transaction to a logged-in user. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

export interface CreateTransactionResponse {
  id: string;
  payinAddress: string | null;
  payoutAddress: string | null;
  fromAmount: number | null;
  toAmount: number | null;
  validUntil: string | null;
  redirectUrl: string | null;
}

export interface CreateTransactionError {
  error: string;
  message: string;
}

interface UpstreamTxResponse {
  id?: string;
  payinAddress?: string;
  payoutAddress?: string;
  fromAmount?: number;
  toAmount?: number;
  validUntil?: string;
  redirect_url?: string;
  redirectUrl?: string;
  message?: string;
}

export async function createTransaction(
  req: CreateTransactionRequest,
): Promise<CreateTransactionResponse> {
  const flow: RateFlow = req.flow ?? 'standard';
  if (flow === 'fixed-rate' && !req.rateId) {
    throw {
      error: 'bad_request',
      message: 'rateId required for fixed-rate',
    } as CreateTransactionError;
  }

  const payload: Record<string, unknown> = {
    provider: req.provider ?? 'default',
    fromCurrency: req.fromCurrency.toLowerCase(),
    toCurrency: req.toCurrency.toLowerCase(),
    fromNetwork: req.fromNetwork.toLowerCase(),
    toNetwork: req.toNetwork.toLowerCase(),
    address: req.address,
    flow,
    source: req.source ?? 'site',
  };
  if (req.type) payload.type = req.type;
  if (req.rateId) payload.rateId = req.rateId;
  if (req.fromAmount != null) payload.fromAmount = req.fromAmount;
  if (req.toAmount != null) payload.toAmount = req.toAmount;
  if (req.extraId) payload.extraId = req.extraId;
  if (req.refundAddress) payload.refundAddress = req.refundAddress;
  if (req.promoCode) payload.promoCode = req.promoCode;
  if (req.userId) payload.userId = req.userId;
  if (req.linkId) payload.linkId = req.linkId;
  if (req.info) payload.info = req.info;

  const url = `${VIP_API_BASE}/v1.1/transactions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Authed POSTs need the session cookie. Public POSTs (private transfer,
      // fiat, anon swap) don't, but `omit` is the explicit version of the
      // browser default for cross-origin without credentials.
      credentials: req.authenticated ? 'include' : 'omit',
      signal: req.signal,
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw {
      error: 'upstream_unreachable',
      message: 'Transaction service unavailable',
    } as CreateTransactionError;
  }

  const data = (await res.json().catch(() => null)) as UpstreamTxResponse | null;
  if (!res.ok || !data) {
    throw {
      error: 'upstream_failure',
      message:
        (data && typeof data.message === 'string' && data.message) ||
        `Upstream HTTP ${res.status}`,
    } as CreateTransactionError;
  }
  if (!data.id) {
    throw {
      error: 'upstream_failure',
      message: data.message ?? 'Missing transaction id',
    } as CreateTransactionError;
  }

  return {
    id: data.id,
    payinAddress: data.payinAddress ?? null,
    payoutAddress: data.payoutAddress ?? null,
    fromAmount: data.fromAmount ?? null,
    toAmount: data.toAmount ?? null,
    validUntil: data.validUntil ?? null,
    redirectUrl: data.redirect_url ?? data.redirectUrl ?? null,
  };
}

// ─── Deep-link builders ────────────────────────────────────────────────────

/**
 * Build the our-app exchange-creation deep link. The page reads these params
 * and pre-fills its calculator. Mirrors `/exchange?from=…&to=…&amount=…`
 * usage from the legacy SPA — same param names so legacy entry points still
 * work after we host `/exchange` ourselves.
 *
 * `base` defaults to a same-origin path (no host), which is what we want
 * when navigating from one page on this site to another. Pass an explicit
 * base URL when constructing a link from outside this app.
 */
export function buildExchangeUrl(args: {
  from: string;
  to: string;
  amount?: string | number;
  /** Reverse mode: encodes `&amountTo=…`. Auto-promotes to fixed-rate when
   *  this is present (matching the "I want X TO" intent flow). Wins over
   *  `amount`. */
  toAmount?: string | number;
  flow?: RateFlow;
  /** When true, adds `&fiatMode=true` to boot the buy/sell calculator. */
  fiatMode?: boolean;
  /** When true, adds `&proExchangeMode=true` to deep-link into legacy's
   *  trade calculator (we still defer Pro spot/limit/market to legacy). */
  proMode?: boolean;
  /** `'self'` (default) → relative `/exchange?…` so we route within our
   *  Next app. Pass an absolute base (`SITE_URL`, `https://other`) to
   *  force an off-site link. */
  base?: string;
}): string {
  const qs = new URLSearchParams({
    from: args.from.toLowerCase(),
    to: args.to.toLowerCase(),
  });
  if (args.toAmount != null && args.toAmount !== '') qs.set('amountTo', String(args.toAmount));
  else if (args.amount != null && args.amount !== '') qs.set('amount', String(args.amount));
  if (args.flow === 'fixed-rate') qs.set('rateMode', 'fixed');
  if (args.fiatMode) qs.set('fiatMode', 'true');
  // Pro mode still rides the legacy URL — our /exchange page deep-links
  // out to `${SITE_URL}/exchange?proExchangeMode=true` for the Convert
  // tab so users land in legacy's trade calculator. Forcing the absolute
  // base when Pro is set keeps that contract intact even when the caller
  // didn't specify one.
  if (args.proMode) {
    qs.set('proExchangeMode', 'true');
    return `${(args.base ?? SITE_URL).replace(/\/$/, '')}/exchange?${qs.toString()}`;
  }
  const base = args.base ?? '';
  return `${base.replace(/\/$/, '')}/exchange?${qs.toString()}`;
}

/**
 * Deep-link to the legacy `/private-transfers` landing with the calculator
 * prefilled. The landing reads the same `from` / `to` / `amountTo` query
 * params as the exchange flow (the Redux init layer is shared) plus an
 * extra `address` param it surfaces into the recipient-wallet field.
 *
 * We always send `from === to` because private-transfers is a single-asset
 * flow — sender pays X TICKER, recipient gets X TICKER minus the fee.
 * Cross-asset bridges go through `buildExchangeUrl` instead.
 */
export function buildPrivateTransferUrl(args: {
  ticker: string;
  network?: string;
  toAmount?: string | number;
  fromAmount?: string | number;
  address?: string;
  extraId?: string;
  base?: string;
}): string {
  const base = args.base ?? SITE_URL;
  const tk = args.ticker.toLowerCase();
  const qs = new URLSearchParams({ from: tk, to: tk });
  if (args.network) {
    qs.set('fromNetwork', args.network.toLowerCase());
    qs.set('toNetwork', args.network.toLowerCase());
  }
  if (args.toAmount != null && args.toAmount !== '') {
    qs.set('amountTo', String(args.toAmount));
  } else if (args.fromAmount != null && args.fromAmount !== '') {
    qs.set('amount', String(args.fromAmount));
  }
  if (args.address) qs.set('address', args.address);
  if (args.extraId) qs.set('recipientExtraId', args.extraId);
  return `${base}/private-transfers?${qs.toString()}`;
}
