// Browser-side API for the Loans flow. Talks directly to vip-api's
// CoinRabbit routes (the loan partner under the hood) — same direct-call
// pattern as `lib/api/exchange.ts`. Only two endpoints we actually need
// for the calculator: enumerate enabled deposit/loan currencies, and
// estimate a quote. Confirmation/create lives in the user's personal
// cabinet — the calculator just deep-links there.

import { VIP_API_BASE } from '@/lib/config';

export type LoanExchangeType = 'direct' | 'reverse';

/** Normalized loan currency. Snake-case fields from upstream are mapped
 *  to camelCase so React code doesn't have to. `isStable` is preserved
 *  but **not** used to filter the pickers — the calculator is a single
 *  unified surface where the user picks whatever combination they want.
 *  Legacy used `isStable` to drive Bull / Bear tabs; we don't. */
export interface LoanCurrency {
  /** Display ticker, lowercase (e.g. `'usdt'`). */
  ticker: string;
  /** Display ticker, normalized to lowercase for picker input matching. */
  currentTicker: string;
  /** Network code, lowercase (e.g. `'trx'`, `'eth'`). */
  network: string;
  /** Human-readable name. */
  name: string;
  /** Logo URL from the upstream catalog. May be absolute or a path. Named
   *  `iconUrl` to line up with the `Currency` type so the same `<Coin>`
   *  and `<CoinTrigger>` primitives accept either source structurally. */
  iconUrl: string | null;
  /** Decimal places used to format estimate output for this side. */
  decimalPlaces: number;
  /** Minimum collateral amount (only meaningful on the deposit side). */
  loanDepositMinAmount: number | null;
  /** Minimum loan amount (only meaningful on the loan side). */
  loanReceiveMinAmount: number | null;
  /** Maximum loan amount (only meaningful on the loan side). */
  loanReceiveMaxAmount: number | null;
  /** Default deposit amount the legacy form seeded with. */
  loanDepositDefaultAmount: number | null;
  /** Sort hint within the deposit list (lower = earlier). */
  loanDepositPriority: number;
  /** Sort hint within the loan list. */
  loanReceivePriority: number;
  /** Stable-coin flag from upstream. Not used to filter UI — the legacy
   *  Bull/Bear tab split is intentionally retired in this calculator. */
  isStable: boolean;
}

export interface LoanCurrencyLists {
  /** Currencies the user can post as collateral. Sorted by deposit priority. */
  deposit: LoanCurrency[];
  /** Currencies the user can receive as the loan. Sorted by receive priority. */
  loan: LoanCurrency[];
}

interface UpstreamLoanCurrency {
  code: string;
  network: string;
  name?: string;
  logo_url?: string | null;
  decimal_places?: number;
  loan_deposit_min_amount?: number | string | null;
  loan_receive_min_amount?: number | string | null;
  loan_receive_max_amount?: number | string | null;
  loan_deposit_default_amount?: number | string | null;
  loan_deposit_priority?: number;
  loan_receive_priority?: number;
  is_stable?: boolean;
  is_loan_deposit_enabled?: boolean;
  is_loan_receive_enabled?: boolean;
}

interface UpstreamCurrenciesEnvelope {
  result?: boolean;
  response?: UpstreamLoanCurrency[];
}

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const mapCurrency = (raw: UpstreamLoanCurrency): LoanCurrency => {
  const code = (raw.code ?? '').toLowerCase();
  return {
    ticker: code,
    currentTicker: code,
    network: (raw.network ?? '').toLowerCase(),
    name: raw.name ?? raw.code ?? '',
    iconUrl: raw.logo_url ?? null,
    decimalPlaces: typeof raw.decimal_places === 'number' ? raw.decimal_places : 8,
    loanDepositMinAmount: toNumber(raw.loan_deposit_min_amount),
    loanReceiveMinAmount: toNumber(raw.loan_receive_min_amount),
    loanReceiveMaxAmount: toNumber(raw.loan_receive_max_amount),
    loanDepositDefaultAmount: toNumber(raw.loan_deposit_default_amount),
    loanDepositPriority: typeof raw.loan_deposit_priority === 'number' ? raw.loan_deposit_priority : 9999,
    loanReceivePriority: typeof raw.loan_receive_priority === 'number' ? raw.loan_receive_priority : 9999,
    isStable: raw.is_stable === true,
  };
};

// Module-level cache. Loan currencies are stable on the order of hours;
// 60s is generous for the calculator's typical session and shields the
// upstream from a per-mount fetch on each /exchange page open.
let cachedLists: LoanCurrencyLists | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;
let inflight: Promise<LoanCurrencyLists> | null = null;

export async function fetchCoinRabbitCurrencies(args: {
  signal?: AbortSignal;
} = {}): Promise<LoanCurrencyLists> {
  const now = Date.now();
  if (cachedLists && now - cachedAt < CACHE_TTL_MS) return cachedLists;
  if (inflight) return inflight;

  const url = new URL('/v2/coin-rabbit/currencies', VIP_API_BASE);
  url.searchParams.set('isEnabled', 'true');

  inflight = (async () => {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: args.signal,
        cache: 'no-store',
      });
    } catch (err) {
      inflight = null;
      throw err;
    }
    const data = (await res.json().catch(() => null)) as UpstreamCurrenciesEnvelope | null;
    inflight = null;
    if (!res.ok || !data?.response || !Array.isArray(data.response)) {
      throw new Error(`coin-rabbit/currencies HTTP ${res.status}`);
    }
    const all = data.response;
    const deposit = all
      .filter((c) => c.is_loan_deposit_enabled)
      .map(mapCurrency)
      .sort((a, b) => a.loanDepositPriority - b.loanDepositPriority);
    const loan = all
      .filter((c) => c.is_loan_receive_enabled)
      .map(mapCurrency)
      .sort((a, b) => a.loanReceivePriority - b.loanReceivePriority);
    const lists: LoanCurrencyLists = { deposit, loan };
    cachedLists = lists;
    cachedAt = Date.now();
    return lists;
  })();

  return inflight;
}

// ─── Estimate ──────────────────────────────────────────────────────────

export interface LoanEstimateRequest {
  fromCode: string;
  fromNetwork: string;
  toCode: string;
  toNetwork: string;
  amount: string | number;
  exchange: LoanExchangeType;
  /** Loan-to-value ratio. Legacy hardcodes 0.5 across the entire flow —
   *  the upstream accepts a configurable value, but we don't surface that
   *  toggle in the calculator. */
  ltvPercent?: number;
  signal?: AbortSignal;
}

export interface LoanEstimateResponse {
  amountFrom: number | null;
  amountTo: number | null;
  /** Liquidation rate — the price at which the deposit auto-sells. Shown
   *  in the terms block. May arrive as a string with currency formatting
   *  already applied; we preserve the raw string for display. */
  downLimit: string | null;
  /** Annualized rate as a percentage number (e.g. `14` for 14%). */
  interestPercent: number | null;
  /** Accrued interest amounts for the standard rollup periods. Strings
   *  because the upstream pre-formats them with decimals. */
  interestAmounts: {
    day: string | null;
    month: string | null;
    year: string | null;
  };
  oneMonthFee: string | null;
  /** Machine-readable error code from upstream (e.g. `INVALID_PAIR`). */
  errorCode: string | null;
}

interface UpstreamEstimateEnvelope {
  result?: boolean;
  response?: {
    amount_from?: number | string | null;
    amount_to?: number | string | null;
    down_limit?: string | null;
    interest_percent?: number | string | null;
    interest_amounts?: {
      day?: string | null;
      month?: string | null;
      year?: string | null;
    };
    one_month_fee?: string | null;
    errorData?: {
      code?: string;
      message?: string;
    };
  };
}

export async function fetchLoanEstimate(req: LoanEstimateRequest): Promise<LoanEstimateResponse> {
  const url = new URL('/v2/coin-rabbit/loan-amount/estimated', VIP_API_BASE);
  url.searchParams.set('fromCode', req.fromCode.toUpperCase());
  url.searchParams.set('fromNetwork', req.fromNetwork);
  url.searchParams.set('toCode', req.toCode.toUpperCase());
  url.searchParams.set('toNetwork', req.toNetwork);
  url.searchParams.set('amount', String(req.amount));
  url.searchParams.set('exchange', req.exchange);
  url.searchParams.set('ltvPercent', String(req.ltvPercent ?? 0.5));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: req.signal,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as UpstreamEstimateEnvelope | null;
  if (!res.ok || !data) {
    throw new Error(`coin-rabbit/loan-amount/estimated HTTP ${res.status}`);
  }
  const r = data.response ?? {};
  return {
    amountFrom: toNumber(r.amount_from),
    amountTo: toNumber(r.amount_to),
    downLimit: r.down_limit ?? null,
    interestPercent: toNumber(r.interest_percent),
    interestAmounts: {
      day: r.interest_amounts?.day ?? null,
      month: r.interest_amounts?.month ?? null,
      year: r.interest_amounts?.year ?? null,
    },
    oneMonthFee: r.one_month_fee ?? null,
    errorCode: r.errorData?.code ?? null,
  };
}

// ─── Deep-link builder ─────────────────────────────────────────────────

/**
 * Build the deep-link target for the personal cabinet's loans page. The
 * cabinet reads `from` / `fromNetwork` / `to` / `toNetwork` / `amount`
 * and pre-fills its calculator, then walks the user through the
 * confirmation step (collateral deposit address, ToS, etc.).
 *
 * Unauth users should be sent to `/registration?next=<this url>` so the
 * pair survives the sign-up round trip. The Loans calculator on this
 * site never POSTs `/v2/coin-rabbit/loan` directly — that lives in the
 * cabinet.
 */
export function buildLoanDeepLink(args: {
  from: string;
  fromNetwork: string;
  to: string;
  toNetwork: string;
  amount?: string | number;
  /** Absolute base. Defaults to the main site origin. */
  base: string;
}): string {
  const qs = new URLSearchParams({
    from: args.from.toLowerCase(),
    fromNetwork: args.fromNetwork.toLowerCase(),
    to: args.to.toLowerCase(),
    toNetwork: args.toNetwork.toLowerCase(),
  });
  if (args.amount != null && args.amount !== '') qs.set('amount', String(args.amount));
  return `${args.base.replace(/\/$/, '')}/pro/loans?${qs.toString()}`;
}
