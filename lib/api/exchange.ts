// Client-side helpers for the calculator. Heavy lifting (API key handling,
// v1/v2 selection, reverse synthesis) lives in `app/api/estimate/route.ts`
// — the browser only ever talks to our own route, never directly to the
// upstream. Keeps the API key off the wire.

import { SITE_URL } from '@/lib/config';

export type RateFlow = 'standard' | 'fixed-rate';
export type EstimateType = 'direct' | 'reverse';

export interface EstimateRequest {
  from: string;
  to: string;
  /** Network for `from`. Defaults server-side to the lowercase ticker — fine
   *  for single-network coins (BTC, ETH); required for multi-network ones
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
   * Extra amount a Pro user would receive, in USD. Server-side derived
   * from the cashback API (returns NOW token) × cached NOW→USD price.
   * `null` when either lookup fails; `0` when the pair offers no benefit.
   */
  cashbackUsd: number | null;
  /** Available providers (fiat on-ramps). Empty for crypto-crypto pairs. */
  providers: EstimateProvider[];
}

export interface EstimateError {
  error: string;
  message: string;
}

export async function fetchEstimate(req: EstimateRequest): Promise<EstimateResponse> {
  const flow = req.flow ?? 'standard';
  const type = req.type ?? 'direct';
  const params = new URLSearchParams({
    from: req.from.toLowerCase(),
    to: req.to.toLowerCase(),
    flow,
    type,
  });
  if (req.fromNetwork) params.set('fromNetwork', req.fromNetwork.toLowerCase());
  if (req.toNetwork) params.set('toNetwork', req.toNetwork.toLowerCase());
  if (type === 'direct' && req.fromAmount != null)
    params.set('fromAmount', String(req.fromAmount));
  if (type === 'reverse' && req.toAmount != null)
    params.set('toAmount', String(req.toAmount));
  // `useRateId=true` is required for fixed-rate quotes — without it the
  // upstream returns a price snapshot but no `rateId`, so we couldn't
  // bind it to a transaction at submit time. The same flag is what
  // unlocks the same-asset (private-transfer) path on vip-api.
  if (flow === 'fixed-rate') params.set('useRateId', 'true');

  const res = await fetch(`/api/estimate?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: req.signal,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || !data) {
    throw (data as EstimateError | null) ?? {
      error: 'unknown',
      message: `HTTP ${res.status}`,
    };
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    throw data as EstimateError;
  }
  return data as EstimateResponse;
}

/**
 * Build the production exchange-page deep link. The host site reads these
 * params and pre-fills its calculator. Mirrors `/exchange?from=…&to=…&amount=…`
 * usage from the legacy SPA.
 */
export function buildExchangeUrl(args: {
  from: string;
  to: string;
  amount?: string | number;
  /** Reverse mode: encodes `&amountTo=…`. The legacy SPA auto-promotes to
   *  fixed-rate when this is present (see `legacy_exchange_routing.md`),
   *  matching how a "I want X TO" intent flows. Wins over `amount`. */
  toAmount?: string | number;
  flow?: RateFlow;
  /** When true, adds `&fiatMode=true` so the legacy SPA boots the buy/sell calculator. */
  fiatMode?: boolean;
  /** When true, adds `&proExchangeMode=true` so the legacy SPA boots the trade (Pro) calculator. */
  proMode?: boolean;
  base?: string;
}): string {
  const base = args.base ?? SITE_URL;
  const qs = new URLSearchParams({
    from: args.from.toLowerCase(),
    to: args.to.toLowerCase(),
  });
  if (args.toAmount != null && args.toAmount !== '') qs.set('amountTo', String(args.toAmount));
  else if (args.amount != null && args.amount !== '') qs.set('amount', String(args.amount));
  if (args.flow === 'fixed-rate') qs.set('rateMode', 'fixed');
  if (args.fiatMode) qs.set('fiatMode', 'true');
  if (args.proMode) qs.set('proExchangeMode', 'true');
  return `${base}/exchange?${qs.toString()}`;
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
  /** Recipient amount (the canonical "you receive" side). Forwards as
   *  `amountTo` and overrides `fromAmount` when both are present. */
  toAmount?: string | number;
  /** Sender total (the "you send" side). Forwards as `amount`. Used when
   *  the user has flipped the rate row so they're typing the total. */
  fromAmount?: string | number;
  address?: string;
  /** Memo / destination tag / payment ID for chains that require it
   *  alongside the address (XRP, TON-USDT, Cosmos, Monero). The legacy
   *  page reads it from `recipientExtraId` (same key as `/exchange`). */
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
