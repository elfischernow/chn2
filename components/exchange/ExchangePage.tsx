'use client';

import { useEffect, useMemo, useState } from 'react';

import { BuySellView } from '@/components/homepage/calculator/modes/buysell/BuySellView';
import { ConvertView } from '@/components/homepage/calculator/modes/convert/ConvertView';
import { impliedFromTo } from '@/components/homepage/calculator/modes/convert/LimitPriceField/limit-math';
import { useLimitState } from '@/components/homepage/calculator/modes/convert/LimitPriceField/useLimitState';
import { LoanAprBadge } from '@/components/homepage/calculator/modes/loans/LoanAprBadge';
import { LoansView } from '@/components/homepage/calculator/modes/loans/LoansView';
import { useLoanCurrencies } from '@/components/homepage/calculator/modes/loans/useLoanCurrencies';
import { useLoanEstimate } from '@/components/homepage/calculator/modes/loans/useLoanEstimate';
import { PrivateView } from '@/components/homepage/calculator/modes/private/PrivateView';
import { SwapView } from '@/components/homepage/calculator/modes/swap/SwapView';
import { formatAmount, formatUsd } from '@/components/homepage/calculator/shared/format';
import type { ConvMode, FiatDir, RateUI } from '@/components/homepage/calculator/shared/types';
import {
  amountMatchesDefault,
  currencyDefaultAmount,
  DECIMAL_RE,
  formatDefaultSeed,
} from '@/components/homepage/calculator/shared/utils';
import { FiatProviderStrip } from '@/components/homepage/FiatProviderStrip';
import { useExchangeEstimate } from '@/components/homepage/useExchangeEstimate';
import type { Currency } from '@/lib/api/currencies';
import {
  createTransaction,
  type EstimateResponse,
  type EstimateType,
  type RateFlow,
} from '@/lib/api/exchange';
import { buildLoanDeepLink, type LoanCurrency } from '@/lib/api/coin-rabbit';
import {
  isPromoCodeFormatValid,
  promoDiscountFraction,
  promoDiscountPercent,
} from '@/lib/api/promo-code';
import type { UserSession } from '@/lib/auth/dal';
import { setOpenFromFiatModeFlag } from '@/lib/auth/post-auth.client';
import { CN_SITE_URL, type Locale, SITE_URL } from '@/lib/config';
import { useI18n } from '@/lib/i18n/client';
import { shouldReverseDisplay } from '@/lib/limit-rate';
import { FORCED_RECOMMENDED_PROVIDER } from '@/lib/providers/catalog';

import { ConfirmationAgreements } from './ConfirmationAgreements';
import { ExtraIdField } from './ExtraIdField';
import { HighNetworkFeesModal } from './HighNetworkFeesModal';
import { PromoCodeField } from './PromoCodeField';
import { RefundAddressField } from './RefundAddressField';
import { UsefulTips } from './UsefulTips';
import { WalletAddressField } from './WalletAddressField';

import './exchange-page.css';

// Per-mode defaults — same source-of-truth as the homepage SwapWidget so
// switching tabs on either surface lands in the same canonical state.
const DEFAULTS = {
  swap: { from: 'BTC', to: 'ETH', fromNetwork: 'btc', toNetwork: 'eth', amount: '0.1' },
  buy: { from: 'USD', to: 'BTC', fromNetwork: 'usd', toNetwork: 'btc', amount: '100' },
  sell: { from: 'BTC', to: 'EUR', fromNetwork: 'btc', toNetwork: 'eur', amount: '0.01' },
  // Loans canonical entry — BTC collateral, USDT-TRC20 loan, 0.1 BTC.
  // The natural framing is "put up crypto, get a stablecoin loan", and
  // the "price down limit" reference then reads as a clean
  // "crypto-priced-in-stable" rate. Mirrors the homepage SwapWidget so
  // swapping surfaces keeps the same anchor pair across the site.
  loans: { from: 'BTC', to: 'USDT', fromNetwork: 'btc', toNetwork: 'trx', amount: '0.1' },
  // Bridge default: USDT-TRC20 → USDT-Solana at 200 USDT. Mirrors the
  // homepage SwapWidget anchor — see the long comment there for the
  // reasoning.
  bridge: { from: 'USDT', to: 'USDT', fromNetwork: 'trx', toNetwork: 'sol', amount: '200' },
} as const;

const TABS = [
  { id: 'swap', label: 'Swap' },
  { id: 'buysell', label: 'Buy / Sell' },
  // Internal id stays `convert` (URL hash, sessionStorage flags, analytics
  // all key off it); user-facing label is "Trade" to match the homepage
  // SwapWidget — mode is the Pro spot/limit/market book, not balance
  // conversion. Don't refactor the id without updating those consumers.
  { id: 'convert', label: 'Trade' },
] as const;

const MORE_TABS = [
  { id: 'private', label: 'Private transfer' },
  { id: 'loans', label: 'Loans' },
  { id: 'bridge', label: 'Bridge' },
] as const;

type TabId = (typeof TABS)[number]['id'] | (typeof MORE_TABS)[number]['id'];

interface ExchangePageProps {
  currencies: readonly Currency[];
  session: UserSession | null;
  locale: Locale;
}

/**
 * The /exchange page orchestrator — calculator + recipient + extras +
 * ToS + CTA + useful tips. Mirrors the legacy SetTransactionStep but
 * built on top of the new lego (per-mode views, FiatProviderStrip,
 * useExchangeEstimate). Convert / Loans / Bridge tabs deep-link out to
 * the legacy app the same way the homepage does — those flows stay there
 * for now and will be ported separately.
 *
 * Inline (full create-transaction): Swap, Buy/Sell, Private transfer.
 * Deep-link only:                   Convert, Loans, Bridge.
 */
export function ExchangePage({ currencies, session, locale }: ExchangePageProps) {
  const t = useI18n();
  const isLoggedIn = session !== null;
  const localePrefix = locale === 'en' ? '' : `/${locale}`;

  // ─── Tab + flow state ─────────────────────────────────────────────────
  const [tab, setTab] = useState<TabId>('swap');
  const [moreOpen, setMoreOpen] = useState(false);
  const [rate, setRate] = useState<RateUI>('floating');
  const [fiatDir, setFiatDir] = useState<FiatDir>('buy');
  // Trade sub-mode. Same lego the homepage SwapWidget uses — when the
  // Trade tab is active, `convMode` (limit / market / fixed) owns the
  // rate behaviour and `rate` (above) is ignored. Default `'limit'`
  // mirrors the homepage so the advanced-orders flow is the first
  // thing the user sees.
  const [convMode, setConvMode] = useState<ConvMode>('limit');

  // ─── Pair + amounts ───────────────────────────────────────────────────
  const [from, setFrom] = useState<string>(DEFAULTS.swap.from);
  const [to, setTo] = useState<string>(DEFAULTS.swap.to);
  const [fromNetwork, setFromNetwork] = useState<string>(DEFAULTS.swap.fromNetwork);
  const [toNetwork, setToNetwork] = useState<string>(DEFAULTS.swap.toNetwork);
  const [direction, setDirection] = useState<EstimateType>('direct');
  const [fromAmount, setFromAmount] = useState<string>(() => {
    const initial = currencies.find(
      (c) =>
        c.currentTicker.toUpperCase() === DEFAULTS.swap.from &&
        c.network === DEFAULTS.swap.fromNetwork,
    );
    const def = currencyDefaultAmount(initial);
    return def != null ? formatDefaultSeed(def) : DEFAULTS.swap.amount;
  });
  const [toAmount, setToAmount] = useState('');

  // ─── Form fields ──────────────────────────────────────────────────────
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientExtraId, setRecipientExtraId] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [providerType, setProviderType] = useState<string | null>(null);

  // Promo code is sent to the estimate as soon as it matches the
  // 12-char format. The upstream validates inline and stuffs the result
  // into `provider.promoCode` on the estimate response — same path the
  // legacy SPA reads from. No separate `/promo-codes/{hash}` round-trip:
  // the dashboard endpoint exists but the production data lives behind
  // the estimate's verdict.
  const trimmedPromo = promoCode.trim();
  const effectivePromoCode =
    isPromoCodeFormatValid(trimmedPromo) ? trimmedPromo : undefined;

  // ─── Agreement state ──────────────────────────────────────────────────
  // Both default to `true` — the user has already implicitly accepted by
  // arriving at the /exchange page; the checkboxes (rendered under the
  // CTA now) are a "tap to revoke" affordance, not a "tap to accept"
  // gate. Mirrors the legacy SetTransactionStep, which preselects the
  // checkboxes on mount.
  const [agreedChangeNow, setAgreedChangeNow] = useState(true);
  const [agreedThirdParty, setAgreedThirdParty] = useState(true);

  // ─── Submit state ─────────────────────────────────────────────────────
  const [submit, setSubmit] = useState<'idle' | 'sending' | string>('idle');
  const [highFeesOpen, setHighFeesOpen] = useState(false);
  // When the user accepts the high-fees modal we want to skip it on the
  // next submit attempt for the same quote — the upstream's flag doesn't
  // change between adjacent submits, and re-prompting after the user
  // already said yes is just nagging.
  const [highFeesAccepted, setHighFeesAccepted] = useState(false);

  // Lookup helpers — stable map keyed by `(ticker, network)` because
  // multi-chain tickers (USDT, XRP, …) can't be resolved by ticker alone.
  const currencyByPair = useMemo(() => {
    const m = new Map<string, Currency>();
    for (const c of currencies) m.set(`${c.currentTicker.toUpperCase()}:${c.network}`, c);
    return m;
  }, [currencies]);
  const fromCurrency = currencyByPair.get(`${from}:${fromNetwork}`);
  const toCurrency = currencyByPair.get(`${to}:${toNetwork}`);

  const fromDefaultAmount = currencyDefaultAmount(fromCurrency);

  // ─── Mode flags ───────────────────────────────────────────────────────
  const isSwap = tab === 'swap';
  const isFiatMode = tab === 'buysell';
  const isConvert = tab === 'convert';
  const isPrivate = tab === 'private';
  const isLoans = tab === 'loans';
  const isBridge = tab === 'bridge';
  // No mode is a placeholder anymore — Bridge graduated to an inline
  // `createTransaction` flow (same as Swap, just with `source=bridge`
  // and the chain-then-coin picker).
  const isPlaceholder = false;
  // Inline modes render the form section (rate row + agreements +
  // CTA). Convert and Loans are inline too — they render the calculator
  // and a CTA, but the CTA is a deep-link to /pro/* instead of an inline
  // `createTransaction`. Bridge is fully inline.
  const isInline = isSwap || isFiatMode || isPrivate || isConvert || isLoans || isBridge;

  // ─── Estimate ─────────────────────────────────────────────────────────
  // Private rides the same path as Swap (single-asset estimate via the
  // private-transfer source). Convert: market/limit use the standard
  // floating quote, fixed uses fixed-rate. Other modes use the user's
  // explicit toggle.
  const flow: RateFlow = isPrivate
    ? 'fixed-rate'
    : isConvert
      ? convMode === 'fixed'
        ? 'fixed-rate'
        : 'standard'
      : rate === 'fixed'
        ? 'fixed-rate'
        : 'standard';
  const driverAmount = direction === 'direct' ? fromAmount : toAmount;
  // Pass empty amount when Loans is active so the swap estimator stays
  // idle — Loans rides its own `useLoanEstimate` (different upstream,
  // different response shape) below.
  const { estimate, error, isLoading } = useExchangeEstimate({
    from,
    to,
    fromNetwork,
    toNetwork,
    amount: isLoans ? '' : driverAmount,
    flow,
    type: direction,
    // Only Trade (Convert) keeps the "pick a different currency" guard.
    // Every other mode lets same-ticker / same-network pairs fall through
    // to the upstream estimator — Swap, Buy/Sell, Bridge, Loans and
    // Private all have legitimate mono-pair use-cases and the upstream
    // returns the real error when one applies. Convert is crypto-crypto
    // trading; same-pair there is genuinely a UX mistake worth surfacing.
    allowSameAsset: !isConvert,
    // Bridge tab routes the estimate through the upstream's cross-chain
    // liquidity path (rather than the default `'site'`), which can quote
    // pairs that the standard swap engine refuses (e.g. USDT-TRX → USDT-
    // ETH at scale). Same `EstimateResponse` shape on the way back.
    source: isBridge ? 'bridge' : undefined,
    // Forward a successfully-validated promo code so the upstream quotes
    // the post-discount `toAmount`. Invalid / pending validations skip
    // this — see `effectivePromoCode` derivation above.
    promoCode: effectivePromoCode,
  });

  // Loans-mode hooks. `enabled` gates fetches so the upstream isn't hit
  // until the user actually opens the Loans tab. Subsequent re-entries
  // resolve from the module-level cache in `lib/api/coin-rabbit.ts`.
  const loanLists = useLoanCurrencies(isLoans);
  const loanDepositList = loanLists.lists?.deposit ?? [];
  const loanList = loanLists.lists?.loan ?? [];
  const findLoan = (
    list: readonly LoanCurrency[],
    ticker: string,
    network: string,
  ): LoanCurrency | null => {
    const tk = ticker.toLowerCase();
    const nw = network.toLowerCase();
    const exact = list.find(
      (c) => c.currentTicker.toLowerCase() === tk && c.network.toLowerCase() === nw,
    );
    if (exact) return exact;
    return list.find((c) => c.currentTicker.toLowerCase() === tk) ?? null;
  };
  const loanFromCurrency = findLoan(loanDepositList, from, fromNetwork);
  const loanToCurrency = findLoan(loanList, to, toNetwork);
  const {
    estimate: loanEstimate,
    error: loanError,
    isLoading: loanLoading,
  } = useLoanEstimate({
    fromCode: from,
    fromNetwork,
    toCode: to,
    toNetwork,
    amount: driverAmount,
    exchange: direction,
    enabled: isLoans,
  });
  const [loanEstimateRef, setLoanEstimateRef] = useState<typeof loanEstimate>(null);
  if (isLoans && loanEstimate && loanEstimate !== loanEstimateRef) {
    setLoanEstimateRef(loanEstimate);
    if (direction === 'direct' && loanEstimate.amountTo != null) {
      setToAmount(formatAmount(loanEstimate.amountTo));
    } else if (direction === 'reverse' && loanEstimate.amountFrom != null) {
      setFromAmount(formatAmount(loanEstimate.amountFrom));
    }
  }
  const isFixedFlow = flow === 'fixed-rate';

  // Mirror the FOLLOWER field with the latest estimate (same pattern the
  // homepage SwapWidget uses — render-time set, no effect ping-pong).
  const [estimateRef, setEstimateRef] = useState<EstimateResponse | null>(null);
  if (estimate && estimate !== estimateRef) {
    setEstimateRef(estimate);
    if (direction === 'direct' && estimate.toAmount != null) {
      setToAmount(formatAmount(estimate.toAmount));
    } else if (direction === 'reverse' && estimate.fromAmount != null) {
      setFromAmount(formatAmount(estimate.fromAmount));
    }
  }

  const showSkeletonTo = isLoading && direction === 'direct';
  const showSkeletonFrom = isLoading && direction === 'reverse';

  // Promo verdict from the recommended provider on the estimate response.
  // Same selector path the legacy SPA reads from
  // (`provider.promoCode` → `estimatePromoCodeSelector`).
  const promoVerdict = estimate?.promoCode ?? null;
  const isPromoApplied =
    !!promoVerdict &&
    promoVerdict.isValid &&
    !promoVerdict.isExpired &&
    promoVerdict.usesLeft !== 0;
  const promoDiscount = isPromoApplied ? promoDiscountFraction(promoVerdict) : null;
  const promoPercent = isPromoApplied ? promoDiscountPercent(promoVerdict) : null;
  // "Validating" = we sent a format-valid code and the estimate is still
  // in-flight, OR the response landed but doesn't carry the verdict yet.
  const isPromoValidating =
    !!effectivePromoCode &&
    (isLoading || (promoVerdict == null && !error));

  // Strikethrough "what you'd get without promo" — mirrors legacy
  // `estimation-field`'s `nonPromoValue`:
  //   diff      = currentReceive * (discount / 100)
  //   nonPromo  = currentReceive - diff
  // Hidden on reverse (user typed the TO field already) and on fiat (the
  // provider strip is the rate UI there). `null` when no promo / wrong
  // direction → the SwapView shows the standard one-line amount.
  const nonPromoToAmount: string | null = (() => {
    if (!isPromoApplied || promoDiscount == null) return null;
    if (direction !== 'direct') return null;
    if (isFiatMode) return null;
    const n = estimate?.toAmount ?? null;
    if (n == null || !Number.isFinite(n) || n <= 0) return null;
    return formatAmount(n - n * promoDiscount);
  })();

  // ─── Trade (Convert) derivations ──────────────────────────────────────
  // Live rate per unit of FROM. Same number powers the Convert "market
  // rate:" reference line — the calling site frames it.
  const marketRate = useMemo(() => {
    if (!estimate?.toAmount || !estimate.fromAmount) return null;
    return estimate.toAmount / estimate.fromAmount;
  }, [estimate]);
  // Default display orientation for the active pair (stables / priority
  // coins). The limit-price field reads it for its initial state and
  // exposes a flip toggle for the user.
  const defaultInverse = shouldReverseDisplay(fromCurrency, toCurrency);
  const pairTag = `${from}-${to}`;
  // `useLimitState` is called unconditionally (hooks rule). Cost: two
  // `useState` cells; benefit: the user's typed price + flip toggle
  // survive a tab switch back into Trade.
  const limit = useLimitState({ pairTag, marketRate, defaultInverse });
  const isLimit = isConvert && convMode === 'limit';
  // Implied "You buy" amount at the user's limit price. Mirrors the
  // legacy `impliedFromTo(fromAmount, directNum)` derivation so the TO
  // field shows what the order would fill at if the market hits.
  const limitImpliedToNum = isLimit ? impliedFromTo(fromAmount, limit.directNum) : null;
  const limitImpliedTo: string | null =
    limitImpliedToNum != null ? formatAmount(limitImpliedToNum) : null;

  // Rate-line text shown inside the ex-rate-row alongside the mode
  // switcher — same `1 BTC ≈ X ETH` reference the homepage SwapWidget
  // shows in its `.swap-rate` slot. Convert prefixes with "Market rate:"
  // and respects the limit-price flip so the unit aligns with the
  // typed price. The "=" vs "≈" split mirrors the legacy:
  //   - Swap fixed-rate → "=" (a quote we'll honour)
  //   - Swap floating + Convert → "≈" (a market reference)
  const rateLineIsLimit = isConvert && convMode === 'limit';
  const rateLine = useMemo(() => {
    if (marketRate == null) return null;
    if (isConvert) {
      if (rateLineIsLimit && limit.isInverse && marketRate > 0) {
        return `Market rate: 1 ${to} ≈ ${formatAmount(1 / marketRate)} ${from}`;
      }
      return `Market rate: 1 ${from} ≈ ${formatAmount(marketRate)} ${to}`;
    }
    const sign = rate === 'fixed' ? '=' : '≈';
    return `1 ${from} ${sign} ${formatAmount(marketRate)} ${to}`;
  }, [marketRate, from, to, rate, isConvert, rateLineIsLimit, limit.isInverse]);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const onPickFrom = (c: Currency) => {
    const newDef = currencyDefaultAmount(c);
    const wasDefault = amountMatchesDefault(fromAmount, fromDefaultAmount);
    setFrom(c.currentTicker.toUpperCase());
    setFromNetwork(c.network);
    if (wasDefault && newDef != null) setFromAmount(formatDefaultSeed(newDef));
  };

  const onPickTo = (c: Currency) => {
    setTo(c.currentTicker.toUpperCase());
    setToNetwork(c.network);
  };

  const flip = () => {
    setFrom(to);
    setTo(from);
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  };

  const applyDefaults = (preset: keyof typeof DEFAULTS) => {
    const d = DEFAULTS[preset];
    setFrom(d.from);
    setTo(d.to);
    setFromNetwork(d.fromNetwork);
    setToNetwork(d.toNetwork);
    const presetFromCurrency = currencyByPair.get(`${d.from}:${d.fromNetwork}`);
    const presetDefault = currencyDefaultAmount(presetFromCurrency);
    setFromAmount(presetDefault != null ? formatDefaultSeed(presetDefault) : d.amount);
    setToAmount('');
    setDirection('direct');
    setProviderType(null);
  };

  const onTabSwitch = (next: TabId) => {
    setTab(next);
    setMoreOpen(false);
    if (next === 'swap') applyDefaults('swap');
    else if (next === 'buysell') applyDefaults(fiatDir === 'buy' ? 'buy' : 'sell');
    else if (next === 'convert') {
      // Convert deep-links into the Pro spot/limit/market calculator,
      // which only quotes crypto-crypto. Carrying a fiat ticker through
      // the deep-link would land users on an unusable form. Reset to the
      // Swap canonical pair (BTC→ETH) when the current FROM or TO is
      // fiat — non-fiat pairs survive as-is so a user mid-swap can flip
      // into Trade with their pair intact.
      if (fromCurrency?.isFiat || toCurrency?.isFiat) applyDefaults('swap');
    } else if (next === 'loans') {
      // Loans has its own currency list (coin-rabbit) that doesn't
      // overlap with the swap catalog perfectly. Reset to the loans
      // canonical pair (USDT-TRC20 → BTC) on every switch in — the
      // existing pair on the page might be a fiat or a non-loan-enabled
      // crypto, which would render an empty picker.
      applyDefaults('loans');
    } else if (next === 'bridge') {
      // Bridge is a real inline createTx flow now (not a deep-link); it
      // needs the canonical USDT-TRC20 → USDT-Solana anchor so the chain
      // selector lands on the cross-chain demo case instead of carrying
      // whatever pair the Swap tab last held (e.g. BTC → ETH, which is
      // same-network and reads as a confusing "bridge" entry point).
      applyDefaults('bridge');
    }
    // Private still doesn't reset — the landing message just deep-links
    // to legacy with whatever's currently in state.
  };

  const onFiatDirSwitch = (next: FiatDir) => {
    setFiatDir(next);
    applyDefaults(next === 'buy' ? 'buy' : 'sell');
  };

  // ─── Initial param load ───────────────────────────────────────────────
  // Apply legacy `?from=&to=&amount=&fixedRate=&amountTo=&fiatMode=&proExchangeMode=`
  // params on first mount so deep-links from the homepage / external
  // partners restore the calculator state. Same param set as the legacy
  // `/exchange` SPA — we intentionally don't break the contract.
  //
  // The setState-in-effect bulk-disable below is intentional: the URL
  // is the external system this effect reads, and the only way to seed
  // React state from it is to dispatch — useState initializers run
  // pre-mount on the server too, where `window` is undefined.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const getCurrency = (param: string): Currency | undefined => {
      const raw = (params.get(param) ?? params.get(`cur_${param}`) ?? '').toLowerCase();
      if (!raw) return undefined;
      const networkParam = (params.get(`${param}Network`) ?? '').toLowerCase();
      // Lookup priority:
      //   1. Explicit (ticker, network) tuple — exact match in `currencyByPair`.
      //   2. Network-suffixed canonical `ticker` (e.g. `usdttrc20`) which the
      //      legacy SPA sometimes passes through.
      //   3. Display ticker (`currentTicker`, e.g. `usdt`) — the public UX
      //      uses this; pick the catalog row with the lowest position so
      //      multi-chain tickers default to their canonical chain.
      if (networkParam) {
        const hit = currencyByPair.get(`${raw.toUpperCase()}:${networkParam}`);
        if (hit) return hit;
      }
      const byCanonical = currencies.find((c) => c.ticker.toLowerCase() === raw);
      if (byCanonical) return byCanonical;
      const byDisplay = currencies
        .filter((c) => c.currentTicker.toLowerCase() === raw)
        .sort((a, b) => a.position - b.position)[0];
      return byDisplay;
    };
    const cFrom = getCurrency('from');
    const cTo = getCurrency('to');
    if (cFrom) {
      setFrom(cFrom.currentTicker.toUpperCase());
      setFromNetwork(cFrom.network);
    }
    if (cTo) {
      setTo(cTo.currentTicker.toUpperCase());
      setToNetwork(cTo.network);
    }
    const amount = params.get('amount');
    const amountTo = params.get('amountTo');
    if (amountTo && DECIMAL_RE.test(amountTo)) {
      setDirection('reverse');
      setToAmount(amountTo);
      // Legacy auto-promotes to fixed-rate when `amountTo` is present.
      setRate('fixed');
    } else if (amount && DECIMAL_RE.test(amount)) {
      setDirection('direct');
      setFromAmount(amount);
    }
    if (params.get('fixedRate') === 'true' || params.get('rateMode') === 'fixed') {
      setRate('fixed');
    }
    if (params.get('fiatMode') === 'true') {
      setTab('buysell');
      // The fiat sub-mode (buy vs sell) reads off whichever side is fiat.
      // When neither side was specified in the URL we still need a usable
      // pair — legacy `get-coins.js` defaults to USD→BTC (buy) or BTC→EUR
      // (sell). Apply the same defaults here so the calculator doesn't
      // boot in a Buy/Sell tab with a crypto-crypto pair the estimator
      // can't quote.
      const fromIsFiat = !!cFrom?.isFiat;
      const dir: FiatDir = fromIsFiat ? 'buy' : 'sell';
      setFiatDir(dir);
      if (!cFrom && !cTo) {
        const d = DEFAULTS[dir === 'buy' ? 'buy' : 'sell'];
        setFrom(d.from);
        setTo(d.to);
        setFromNetwork(d.fromNetwork);
        setToNetwork(d.toNetwork);
      }
    }
    if (params.get('proExchangeMode') === 'true') setTab('convert');
    // Loans deep-link: `?mode=loans` (canonical) or `?loanMode=true`
    // (legacy-shaped, mirrors the existing `fiatMode=true` / `proExchangeMode=true`
    // contract). Either lands the user on the Loans tab; the from/to/amount
    // params above already pre-fill the picker state.
    if (params.get('mode') === 'loans' || params.get('loanMode') === 'true') {
      setTab('loans');
    }
    // Bridge deep-link: `?mode=bridge` lands the user on the Bridge tab.
    // The homepage's Cross-chain swap card uses this — one click from
    // the landing into the cross-chain UX, no extra tab switch.
    if (params.get('mode') === 'bridge') {
      setTab('bridge');
    }
    const recipient = params.get('recipientAddress') ?? params.get('address');
    if (recipient) setRecipientAddress(recipient);
    const extra = params.get('recipientExtraId');
    if (extra) setRecipientExtraId(extra);
    const refund = params.get('backupAddress');
    if (refund) setRefundAddress(refund);
    // Legacy `backupExtraId` — if a partner pre-fills a refund memo we
    // surface it via the same recipient-extra-id slot the user can edit.
    // The legacy URL contract supports this even though the visible field
    // is rare; mirror it for parity.
    const backupExtraId = params.get('backupExtraId');
    if (backupExtraId && !recipientExtraId) setRecipientExtraId(backupExtraId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mount
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close the More menu on outside click.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.ex-more')) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);

  // ─── Validation gates ─────────────────────────────────────────────────
  const fiatFromCurrency = !!fromCurrency?.isFiat;
  const isUnauthFiat = isFiatMode && !isLoggedIn;
  const showAgreements = !isLoggedIn;
  const showThirdPartyAgreement = fiatFromCurrency;
  const agreementsOk =
    !showAgreements ||
    (agreedChangeNow && (!showThirdPartyAgreement || agreedThirdParty));

  const recipientRegex = toCurrency?.addressRegex ?? null;
  const recipientValid = (() => {
    const addr = recipientAddress.trim();
    if (!addr) return false;
    if (!recipientRegex) return true;
    try {
      return new RegExp(recipientRegex).test(addr);
    } catch {
      return true;
    }
  })();
  const extraIdRequired = !!toCurrency?.hasExternalId;
  const extraIdRegex = toCurrency?.extraIdRegex ?? null;
  // Mirror legacy `addressValidator.validateExtraId(to, extraId)` — when
  // the chain ships a regex (XRP Tag, TON Memo, Cosmos Memo, Monero
  // payment id), reject mismatches before submit instead of letting the
  // upstream POST 400 with an opaque error.
  const extraIdValid = (() => {
    if (!extraIdRequired) return true;
    const trimmed = recipientExtraId.trim();
    if (!trimmed) return false;
    if (!extraIdRegex) return true;
    try {
      return new RegExp(extraIdRegex).test(trimmed);
    } catch {
      return true;
    }
  })();

  // Anonymous-from currencies (XMR, ZEC shielded, mixers) can't be refunded
  // automatically — the upstream insists on a refund address. Mirrors
  // legacy `getIsCurrencyFromAnonymous` (the `isAnonymous` flag now flows
  // through `lib/api/currencies.ts`).
  const refundRequired = !!fromCurrency?.isAnonymous;
  const refundRegex = fromCurrency?.addressRegex ?? null;
  const refundValid = (() => {
    if (!refundRequired) return true;
    const trimmed = refundAddress.trim();
    if (!trimmed) return false;
    if (!refundRegex) return true;
    try {
      return new RegExp(refundRegex).test(trimmed);
    } catch {
      return true;
    }
  })();

  // ─── Submit ───────────────────────────────────────────────────────────
  const performSubmit = async () => {
    if (submit === 'sending') return;

    // Auth-gate fiat: legacy SPA preserves the calculator state in
    // sessionStorage and bounces unauth users to /authorization. After a
    // successful login `lib/auth/post-auth.client.ts` reads the same flag
    // and routes to /pro/exchange.
    if (isUnauthFiat) {
      try {
        sessionStorage.setItem('exchange:from', JSON.stringify({ ticker: from, network: fromNetwork }));
        sessionStorage.setItem('exchange:to', JSON.stringify({ ticker: to, network: toNetwork }));
        sessionStorage.setItem('exchange:amount', fromAmount);
        if (recipientAddress) sessionStorage.setItem('exchange:address', recipientAddress);
      } catch {
        // sessionStorage can throw under privacy-strict settings — the
        // worst case is the calculator opens with defaults after login.
      }
      setOpenFromFiatModeFlag();
      window.location.href = `${localePrefix}/authorization`;
      return;
    }

    if (!recipientValid) {
      setSubmit('Enter a valid recipient address.');
      return;
    }
    if (!extraIdValid) {
      setSubmit(`This chain requires a ${toCurrency?.externalIdName ?? 'memo'}.`);
      return;
    }
    if (!refundValid) {
      setSubmit('A refund address is required for this currency.');
      return;
    }
    if (!agreementsOk) {
      setSubmit('Accept the agreements to continue.');
      return;
    }
    const rateId = estimate?.rateId;
    if (isFixedFlow && !rateId) {
      setSubmit('Quote is loading — try again in a moment.');
      return;
    }

    // High network fees gate. Triggers on a structural flag the upstream
    // returns when the destination chain's withdrawal cost is unusually
    // large vs. trade size. Skip when the user already accepted on a
    // previous submit for this quote.
    if (estimate?.isHighNetworkFee && !highFeesAccepted) {
      setHighFeesOpen(true);
      return;
    }

    setSubmit('sending');
    try {
      const tx = await createTransaction({
        fromCurrency: from,
        toCurrency: to,
        fromNetwork,
        toNetwork,
        flow,
        type: direction,
        rateId: rateId || undefined,
        ...(direction === 'direct'
          ? { fromAmount: Number(fromAmount) || undefined }
          : { toAmount: Number(toAmount) || undefined }),
        address: recipientAddress.trim(),
        extraId: extraIdRequired ? recipientExtraId.trim() : undefined,
        refundAddress: refundAddress.trim() || undefined,
        promoCode: promoCode.trim() || undefined,
        provider: providerType ?? undefined,
        source: isFiatMode
          ? 'fiat'
          : isPrivate
            ? 'private-transfers'
            : isBridge
              ? 'bridge'
              : 'site',
        authenticated: isLoggedIn,
      });
      window.location.href = `${CN_SITE_URL}/exchange/txs/${encodeURIComponent(tx.id)}`;
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Transaction failed. Try again.';
      setSubmit(msg);
    }
  };

  // Reset the submit error when the user touches the form again.
  useEffect(() => {
    if (submit !== 'idle' && submit !== 'sending') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmit('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipientAddress,
    recipientExtraId,
    refundAddress,
    fromAmount,
    toAmount,
    from,
    to,
    fromNetwork,
    toNetwork,
  ]);

  // ─── Deep-link helpers (Convert/Loans/Bridge tabs) ────────────────────
  const deepLinkHref = (() => {
    if (isConvert) {
      // Convert routes by auth state, NOT by feature: unauth users go to
      // sign-up (the trade calculator is gated to Pro accounts); authed
      // users land on the Pro app's /pro/exchange (a separate deployment
      // from this site and from the legacy SPA — we don't link into its
      // internals beyond the entry path).
      if (!isLoggedIn) return `${localePrefix}/registration`;
      const qs = new URLSearchParams({
        from: from.toLowerCase(),
        to: to.toLowerCase(),
      });
      if (direction === 'reverse' && toAmount) qs.set('amountTo', toAmount);
      else if (fromAmount) qs.set('amount', fromAmount);
      if (flow === 'fixed-rate') qs.set('rateMode', 'fixed');
      return `${CN_SITE_URL}/pro/exchange?${qs.toString()}`;
    }
    if (tab === 'loans') {
      // Loans deep-links into the cabinet's /pro/loans which carries the
      // same query contract (from/fromNetwork/to/toNetwork/amount) and
      // walks the user through the collateral-deposit confirmation step.
      // Unauth users sign up first; the `next=` param hands the pair
      // through the round-trip so the cabinet boots into the same state.
      const loanUrl = buildLoanDeepLink({
        from,
        fromNetwork,
        to,
        toNetwork,
        amount: direction === 'direct' ? fromAmount : toAmount,
        base: SITE_URL,
      });
      if (!isLoggedIn) {
        return `${localePrefix}/registration?next=${encodeURIComponent(loanUrl)}`;
      }
      return loanUrl;
    }
    // Bridge is no longer a deep-link surface — it submits inline via
    // `performSubmit` (see `<button onClick={performSubmit}>` below). The
    // `deepLinkHref` for bridge stays harmless: only `<a>` rendering for
    // Convert/Loans consults it.
    return '#';
  })();

  // Same fallback the homepage uses — pin the TO display to the
  // recommended (Guardarian) provider's quote so the field above and
  // the strip below show the same number.
  const fiatProviderTo: string | null = (() => {
    if (!isFiatMode || !estimate?.providers?.length) return null;
    const explicit = providerType
      ? estimate.providers.find((x) => x.type === providerType)
      : null;
    if (explicit?.estimatedAmount != null) return formatAmount(explicit.estimatedAmount);
    if (providerType) return null;
    const recommended =
      estimate.providers.find((x) => x.type === FORCED_RECOMMENDED_PROVIDER) ??
      estimate.providers[0];
    if (recommended?.estimatedAmount == null) return null;
    return formatAmount(recommended.estimatedAmount);
  })();

  const ctaLabel = (() => {
    if (submit === 'sending') return 'Creating…';
    // Unauth on any inline mode bounces through /authorization or
    // /registration before the actual create-transaction. The legacy
    // SPA uses CONFIRM_BUTTON ("Confirm") for that intermediate state
    // because Buy/Sell/Exchange copy implies the action will actually
    // happen — at this point the user is signing in first.
    if (!isLoggedIn && (isFiatMode || isSwap || isPrivate || isBridge)) {
      return (
        t('EXCHANGE_STEPPER.CONFIRM_TRANSACTION_STEP.CONFIRM_BUTTON') ||
        (isUnauthFiat ? 'Sign in to continue' : 'Confirm')
      );
    }
    if (isFiatMode) {
      return fiatDir === 'buy'
        ? t('EXCHANGE.BUTTON_TEXT_BUY') || `Buy ${to}`
        : t('EXCHANGE.BUTTON_TEXT_SELL') || `Sell ${from}`;
    }
    if (isPrivate) return 'Send';
    if (isBridge) return `Bridge to ${to}`;
    if (isConvert) {
      // Mirror the homepage's Convert CTA: limit sub-mode reads as
      // "Place limit order" to surface the order-type semantics;
      // market/fixed share the generic "Continue" because the deep-link
      // lands the user on Pro where they pick a real action.
      return convMode === 'limit' ? 'Place limit order' : 'Continue';
    }
    if (isLoans) {
      return t('LOANS.CALCULATOR.GET_LOAN') || 'Get Loan';
    }
    return t('EXCHANGE.BUTTON_TEXT') || 'Exchange now';
  })();

  const cashbackUsd = estimate?.cashbackUsd ?? null;
  // Loans doesn't earn cashback (no swap leg) — hide the upsell so the
  // /pro/balance prompt doesn't appear under the CTA on this tab.
  const showCashback = !isFiatMode && !isLoans && cashbackUsd != null && cashbackUsd > 0;
  // Cashback hint copy mirrors legacy `gradientButtonText`: when there's no
  // benefit show `DEFAULT_TEXT` ("Get more with Pro"); otherwise interpolate
  // the USD figure into `ESTIMATIN_TEXT` ("Get ${CASHBACK} more with Pro").
  // The legacy uses `${CASHBACK}` token; our `t()` helper interpolates
  // `{CASHBACK}` so we feed both forms through `replace` — the dict ships
  // the `${…}` form verbatim.
  const cashbackHint = (() => {
    if (cashbackUsd != null && cashbackUsd > 0) {
      const tpl =
        t('EXCHANGE_STEPPER.CASHBACK_BUTTON.ESTIMATIN_TEXT') ||
        'Get ${CASHBACK} more with Pro';
      return tpl.replace('${CASHBACK}', formatUsd(cashbackUsd));
    }
    return t('EXCHANGE_STEPPER.CASHBACK_BUTTON.DEFAULT_TEXT') || 'Get more with Pro';
  })();

  // Persistent error / status surface that always sits above the CTA so
  // the user knows why they can't submit. Out-of-range, estimate failure,
  // or last submit verdict — first non-empty wins. Mirrors legacy's
  // TxCreationError + ExchangeCalculatorWarning combined surface.
  const outOfRange: { kind: 'min' | 'max'; value: number } | null = (() => {
    if (!estimate || estimate.isAmountInRange) return null;
    if (estimate.minAmount != null && estimate.fromAmount < estimate.minAmount) {
      return { kind: 'min', value: estimate.minAmount };
    }
    if (estimate.maxAmount != null && estimate.fromAmount > estimate.maxAmount) {
      return { kind: 'max', value: estimate.maxAmount };
    }
    return null;
  })();
  const submitError = submit !== 'idle' && submit !== 'sending' ? submit : null;
  const banner: { kind: 'error' | 'warn'; text: string } | null = (() => {
    if (submitError) return { kind: 'error', text: submitError };
    if (outOfRange) {
      return {
        kind: 'warn',
        text: `${outOfRange.kind === 'min' ? 'Minimum' : 'Maximum'} amount: ${formatAmount(outOfRange.value)} ${from}`,
      };
    }
    if (error?.message) return { kind: 'error', text: error.message };
    return null;
  })();
  const applyBoundary = (value: number) => {
    setDirection('direct');
    setFromAmount(formatAmount(value));
  };

  return (
    <main className="ex-page">
      <div className="ex-shell">
        <h1 className="ex-title">
          {t('EXCHANGE_STEPPER.SET_TRANSACTION_STEP.TITLE') || 'Create exchange'}
        </h1>

        <section className="ex-card">
          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="ex-tabs" role="tablist">
            {TABS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={tab === m.id}
                className="ex-tab"
                data-active={tab === m.id || undefined}
                onClick={() => onTabSwitch(m.id)}
              >
                {m.label}
              </button>
            ))}
            <div className="ex-more">
              <button
                type="button"
                className="ex-tab ex-tab-more"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                data-active={
                  (tab === 'private' || tab === 'loans' || tab === 'bridge') || undefined
                }
                onClick={() => setMoreOpen((o) => !o)}
              >
                More <span aria-hidden>▾</span>
              </button>
              {moreOpen && (
                <ul className="ex-more-pop" role="menu">
                  {MORE_TABS.map((m) => (
                    <li key={m.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="ex-more-item"
                        onClick={() => onTabSwitch(m.id)}
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Buy/Sell direction toggle ─────────────────────────────── */}
          {isFiatMode && (
            <div className="ex-fiat-dir" role="tablist" aria-label="Buy or sell">
              <button
                type="button"
                role="tab"
                aria-selected={fiatDir === 'buy'}
                className="ex-fiat-dir-btn"
                data-active={fiatDir === 'buy' || undefined}
                onClick={() => onFiatDirSwitch('buy')}
              >
                Buy crypto
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={fiatDir === 'sell'}
                className="ex-fiat-dir-btn"
                data-active={fiatDir === 'sell' || undefined}
                onClick={() => onFiatDirSwitch('sell')}
              >
                Sell crypto
              </button>
            </div>
          )}

          {/* ── Field stack ─────────────────────────────────────────────
              Bridge reuses SwapView verbatim (FROM, flip, TO) — only the
              `pickerKind` flips to render the chain-then-coin selector
              instead of the standard combobox. */}
          {(isSwap || isBridge) && (
            <SwapView
              currencies={currencies}
              from={from}
              fromNetwork={fromNetwork}
              fromAmount={fromAmount}
              to={to}
              toNetwork={toNetwork}
              toAmount={toAmount}
              hasError={!!error}
              showSkeletonFrom={showSkeletonFrom}
              showSkeletonTo={showSkeletonTo}
              isFixedFlow={isFixedFlow}
              withdrawalFee={estimate?.withdrawalFee ?? null}
              pickerKind={isBridge ? 'bridge' : 'standard'}
              promoApplied={isPromoApplied}
              promoPercent={promoPercent}
              nonPromoToAmount={nonPromoToAmount}
              // For the bridge tab, BridgeCurrencyPicker owns the same-
              // ticker auto-select on chain change (it inspects the paired
              // ticker we pass it as `pairedTicker` and pre-resolves the
              // emitted Currency before firing `onSelect`). The parent's
              // `onPickFrom` / `onPickTo` stay unchanged — they receive a
              // fully-resolved Currency just like the standard flow.
              fromPairedTicker={isBridge ? to : undefined}
              toPairedTicker={isBridge ? from : undefined}
              onSelectFrom={onPickFrom}
              onSelectTo={onPickTo}
              onFromAmountChange={(value) => {
                setDirection('direct');
                setFromAmount(value);
              }}
              onToAmountChange={(value) => {
                setDirection('reverse');
                setRate('fixed');
                setToAmount(value);
              }}
              onFlip={flip}
            />
          )}
          {isFiatMode && (
            <BuySellView
              currencies={currencies}
              fiatDir={fiatDir}
              from={from}
              fromNetwork={fromNetwork}
              fromAmount={fromAmount}
              to={to}
              toNetwork={toNetwork}
              toAmount={toAmount}
              hasError={!!error}
              showSkeletonFrom={showSkeletonFrom}
              showSkeletonTo={showSkeletonTo}
              fiatProviderTo={fiatProviderTo}
              onSelectFrom={onPickFrom}
              onSelectTo={onPickTo}
              onFromAmountChange={(value) => {
                setDirection('direct');
                setFromAmount(value);
              }}
              onToAmountChange={(value) => {
                setDirection('reverse');
                setToAmount(value);
              }}
            />
          )}
          {isPrivate && (
            <PrivateView
              currencies={currencies}
              ticker={from}
              network={fromNetwork}
              direction={direction}
              editableAmount={direction === 'direct' ? fromAmount : toAmount}
              recipientAddress={recipientAddress}
              recipientExtraId={recipientExtraId}
              currency={toCurrency}
              onSelectCurrency={(c) => {
                // Mirror FROM and TO on the same asset — private transfer
                // is single-asset (sender pays X, recipient gets X minus
                // network/service fees), so picking on either field
                // updates both. Clear the memo when the chain changes —
                // a destination tag from XRP is meaningless on TON-USDT.
                const tk = c.currentTicker.toUpperCase();
                setFrom(tk);
                setTo(tk);
                setFromNetwork(c.network);
                setToNetwork(c.network);
                setRecipientExtraId('');
              }}
              onAmountChange={(value) => {
                if (direction === 'direct') setFromAmount(value);
                else setToAmount(value);
              }}
              onAddressChange={setRecipientAddress}
              onExtraIdChange={setRecipientExtraId}
            />
          )}
          {isConvert && (
            <ConvertView
              currencies={currencies}
              from={from}
              fromNetwork={fromNetwork}
              fromAmount={fromAmount}
              to={to}
              toNetwork={toNetwork}
              toAmount={toAmount}
              hasError={!!error}
              showSkeletonFrom={showSkeletonFrom}
              showSkeletonTo={showSkeletonTo}
              isFixedFlow={isFixedFlow}
              isLimit={isLimit}
              limitImpliedTo={limitImpliedTo}
              withdrawalFee={estimate?.withdrawalFee ?? null}
              marketRate={marketRate}
              limit={limit}
              onSelectFrom={onPickFrom}
              onSelectTo={onPickTo}
              onFromAmountChange={(value) => {
                setDirection('direct');
                setFromAmount(value);
              }}
              onToAmountChange={(value) => {
                // Convert intentionally does NOT auto-promote rate on TO
                // input — the sub-mode toggle (Market/Fixed/Limit) is the
                // user's explicit lever and clobbering it on every keystroke
                // would override an intentional Market or Limit selection.
                setDirection('reverse');
                setToAmount(value);
              }}
              onFlip={flip}
            />
          )}
          {isLoans && (
            <LoansView
              depositList={loanDepositList}
              loanList={loanList}
              from={from}
              fromNetwork={fromNetwork}
              fromAmount={fromAmount}
              to={to}
              toNetwork={toNetwork}
              toAmount={toAmount}
              fromCurrency={loanFromCurrency}
              toCurrency={loanToCurrency}
              hasError={Boolean(loanError) || loanEstimate?.errorCode != null}
              showSkeletonFrom={loanLoading && direction === 'reverse'}
              showSkeletonTo={loanLoading && direction === 'direct'}
              estimate={loanEstimate}
              isCurrenciesLoading={loanLists.isLoading}
              onSelectFrom={(c) => {
                setFrom(c.currentTicker.toUpperCase());
                setFromNetwork(c.network);
                const def = c.loanDepositDefaultAmount;
                if (def != null) setFromAmount(String(def));
              }}
              onSelectTo={(c) => {
                setTo(c.currentTicker.toUpperCase());
                setToNetwork(c.network);
              }}
              onFromAmountChange={(value) => {
                setDirection('direct');
                setFromAmount(value);
              }}
              onToAmountChange={(value) => {
                setDirection('reverse');
                setToAmount(value);
              }}
            />
          )}
          {isPlaceholder && (
            <DeepLinkPanel
              tab={tab}
              href={deepLinkHref}
              from={from}
              to={to}
              isLoggedIn={isLoggedIn}
            />
          )}

          {/* Per-row admin warning for the destination currency — legacy
              renders this above the recipient field as
              `to.warningTo` (e.g. "Tag is required" reminders, listing
              caveats). Skip on deep-link tabs and Loans (the TO is a
              loan currency from a different catalog with no `warningTo`
              entry to surface). */}
          {isInline && !isLoans && toCurrency?.warningTo && (
            <p className="ex-warning" role="status">
              {toCurrency.warningTo}
            </p>
          )}

          {/* ── Rate row ────────────────────────────────────────────────
              Swap: Floating / Fixed-rate toggle (the legacy flow).
              Trade: Market / Fixed / Limit (mirrors homepage's
              Convert tab — `convMode` owns the rate behaviour and
              drives the flow choice above).
              Fiat hides the row — the provider strip is its rate UI.

              Each variant ships the same content the homepage SwapWidget
              renders in its `.swap-rate` slot: a rate-text span on the
              left (skeleton/error/out-of-range/live rate, in priority
              order) and the mode-switcher pill cluster on the right. */}
          {(isSwap || isConvert || isBridge) && (
            <div className="ex-rate-row">
              <span className="ex-rate-text">
                {outOfRange ? (
                  <button
                    type="button"
                    className="ex-rate-bound"
                    onClick={() => applyBoundary(outOfRange.value)}
                  >
                    {outOfRange.kind === 'min' ? 'Min' : 'Max'}:{' '}
                    <strong>
                      {formatAmount(outOfRange.value)} {from}
                    </strong>
                  </button>
                ) : error ? (
                  <span className="ex-rate-err" role="alert">
                    {error.message || error.error}
                  </span>
                ) : isLoading ? (
                  <span className="ex-rate-skel" aria-hidden />
                ) : (
                  <>
                    {rateLine ?? (isConvert ? `Market rate: 1 ${from} ≈ … ${to}` : `1 ${from} ≈ … ${to}`)}
                  </>
                )}
              </span>
              <div className="ex-rate-toggles">
                {(isSwap || isBridge) && (
                  <>
                    <button
                      type="button"
                      className="ex-rate-toggle"
                      data-active={rate === 'floating' || undefined}
                      onClick={() => setRate('floating')}
                    >
                      Floating
                    </button>
                    <button
                      type="button"
                      className="ex-rate-toggle"
                      data-active={rate === 'fixed' || undefined}
                      onClick={() => setRate('fixed')}
                    >
                      Fixed-rate
                    </button>
                  </>
                )}
                {isConvert && (
                  <>
                    <button
                      type="button"
                      className="ex-rate-toggle"
                      data-active={convMode === 'market' || undefined}
                      onClick={() => setConvMode('market')}
                    >
                      Market
                    </button>
                    <button
                      type="button"
                      className="ex-rate-toggle"
                      data-active={convMode === 'fixed' || undefined}
                      onClick={() => setConvMode('fixed')}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      className="ex-rate-toggle"
                      data-active={convMode === 'limit' || undefined}
                      onClick={() => setConvMode('limit')}
                    >
                      Limit
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Fiat provider strip ───────────────────────────────────── */}
          {isFiatMode && (
            <FiatProviderStrip
              providers={estimate?.providers ?? []}
              selectedType={providerType}
              toCurrency={fiatDir === 'buy' ? to : from}
              onSelect={setProviderType}
              isLoading={isLoading}
            />
          )}

          {/* ── Loans APR plate ───────────────────────────────────────── */}
          {isLoans && (
            <div className="ex-loans-foot">
              <LoanAprBadge estimate={loanEstimate} isLoading={loanLoading} />
              {loanEstimate?.errorCode && (
                <p className="ex-cta-banner ex-cta-banner-warn" role="status">
                  {loanEstimate.errorCode === 'INVALID_PAIR'
                    ? 'This loan pair is not supported at the moment.'
                    : loanEstimate.errorCode}
                </p>
              )}
              {loanError && (
                <p className="ex-cta-banner ex-cta-banner-error" role="alert">
                  {loanError.message}
                </p>
              )}
            </div>
          )}

          {/* ── Form fields (only on inline modes) ────────────────────── */}
          {isInline && (
            <div className="ex-form">
              {/* Address + extra-id — Swap, Buy/Sell and Bridge
                  (PrivateView embeds its own; Convert and Loans hand off
                  address collection to the cabinet/Pro app they deep-link
                  into, so no address here either). */}
              {(isSwap || isFiatMode || isBridge) && !isLoans && (
                <>
                  <WalletAddressField
                    ticker={to}
                    label={
                      isFiatMode && fiatDir === 'sell'
                        ? `Bank account / payout address (${(toCurrency?.name ?? to)})`
                        : undefined
                    }
                    addressRegex={recipientRegex}
                    value={recipientAddress}
                    onChange={setRecipientAddress}
                  />
                  {extraIdRequired && (
                    <ExtraIdField
                      fieldName={toCurrency?.externalIdName ?? 'Memo'}
                      extraIdRegex={toCurrency?.extraIdRegex ?? null}
                      value={recipientExtraId}
                      onChange={setRecipientExtraId}
                    />
                  )}
                </>
              )}
              {/* Optional extras — promo (Swap only) on the left,
                  refund (Swap + Private) on the right. Buy/Sell goes
                  through fiat providers and shows neither. The row
                  source order is `promo` then `refund` so promo sits
                  left; refund picks up `margin-left: auto` in CSS so
                  it stays right-aligned even when promo is hidden
                  (e.g. Private). Expanded states (open inputs) break
                  to their own full-width line via `flex-basis: 100%`. */}
              {(isSwap || isPrivate || isBridge) && !isLoans && (
                <div className="ex-extras-row">
                  {(isSwap || isBridge) && (
                    <PromoCodeField
                      value={promoCode}
                      onChange={setPromoCode}
                      validation={promoVerdict}
                      isValidating={isPromoValidating}
                    />
                  )}
                  <RefundAddressField
                    ticker={from}
                    addressRegex={fromCurrency?.addressRegex ?? null}
                    value={refundAddress}
                    onChange={setRefundAddress}
                    required={refundRequired}
                  />
                </div>
              )}

              {banner && (
                <p
                  className={`ex-cta-banner ex-cta-banner-${banner.kind}`}
                  role={banner.kind === 'error' ? 'alert' : 'status'}
                >
                  {banner.text}
                  {outOfRange && !submitError && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="ex-cta-banner-link"
                        onClick={() => applyBoundary(outOfRange.value)}
                      >
                        Use {outOfRange.kind}
                      </button>
                    </>
                  )}
                </p>
              )}

              {/* CTA — submit button for inline create-transaction flows
                  (Swap, Buy/Sell, Private). Deep-link anchor for Convert
                  (→ /pro/exchange or /registration when unauth) and Loans
                  (→ /pro/loans or /registration?next=…). The two render
                  different elements so screen readers and middle-click
                  both behave correctly. */}
              {isConvert || isLoans ? (
                <a
                  className="ex-cta"
                  href={deepLinkHref}
                >
                  {ctaLabel}
                </a>
              ) : (
                <button
                  type="button"
                  className="ex-cta"
                  onClick={performSubmit}
                  disabled={submit === 'sending' || !agreementsOk}
                  aria-busy={submit === 'sending'}
                >
                  {ctaLabel}
                </button>
              )}

              {/* Legal: third-party-service notice for AUTHED fiat users
                  (unauth users see the third-party agreement checkbox
                  instead). Renders the upstream HTML — the same
                  `dangerouslySetInnerHTML` shape the legacy uses so the
                  inline `<a>` keeps working. */}
              {isLoggedIn && isFiatMode && (
                <p
                  className="ex-fiat-terms"
                  dangerouslySetInnerHTML={{
                    __html:
                      t('EXCHANGE_STEPPER.SET_TRANSACTION_STEP.FIAT_TERMS') ||
                      "By continuing, you aware that this exchange is made through a <a href='https://changenow.io/faq/third-party-service' target='_blank' rel='noopener noreferrer'>third-party service</a>",
                  }}
                />
              )}

              {showCashback && (
                <a
                  className="ex-cashback"
                  href={isLoggedIn ? `${CN_SITE_URL}/pro/balance` : `${localePrefix}/registration`}
                >
                  {cashbackHint}
                </a>
              )}

              {/* Agreements sit below the cashback upsell — default both
                  checkboxes to on (state inits to `true`), so the user
                  can submit immediately and only interacts with them to
                  revoke. Legacy SetTransactionStep does the same.
                  Skip for Convert and Loans — both hand off to /pro
                  surfaces which have their own ToS. */}
              {showAgreements && !isConvert && !isLoans && (
                <ConfirmationAgreements
                  changenowAgreed={agreedChangeNow}
                  thirdPartyAgreed={agreedThirdParty}
                  showThirdParty={showThirdPartyAgreement}
                  onChangenowChange={setAgreedChangeNow}
                  onThirdPartyChange={setAgreedThirdParty}
                  localePrefix={localePrefix}
                />
              )}
            </div>
          )}
        </section>

        {/* Useful tips block is Swap-specific (rate-locking + counter-
            party-risk explainers). Buy/Sell uses provider strip copy,
            Convert deep-links into Pro, Private transfer carries its
            own how-it-works on the dedicated page. */}
        {isSwap && <UsefulTips fixedRate={isFixedFlow} />}
      </div>

      <HighNetworkFeesModal
        open={highFeesOpen}
        onCancel={() => setHighFeesOpen(false)}
        onAccept={() => {
          setHighFeesOpen(false);
          setHighFeesAccepted(true);
          // Re-enter performSubmit so the just-accepted gate doesn't trip
          // again. The function is idempotent w.r.t. already-validated
          // state — this is the same trick legacy uses.
          void performSubmit();
        }}
      />
    </main>
  );
}

/**
 * Static panel rendered for tabs that deep-link out instead of running
 * their own create-transaction flow. Convert routes to legacy with
 * `?proExchangeMode=true`; Loans / Bridge go to their respective landings.
 * Mirrors the homepage's "non-inline" tab behaviour so the user can still
 * use their typed pair as a hand-off into the destination flow.
 */
function DeepLinkPanel({
  tab,
  href,
  from,
  to,
  isLoggedIn,
}: {
  tab: TabId;
  href: string;
  from: string;
  to: string;
  isLoggedIn: boolean;
}) {
  const message = (() => {
    if (tab === 'convert') {
      return isLoggedIn
        ? `Open the Pro app to run a market / limit / fixed-price ${from} → ${to} order.`
        : `Sign up for a Pro account to use market / limit / fixed orders for ${from} → ${to}.`;
    }
    if (tab === 'loans') {
      return 'Borrow stablecoins against your crypto collateral.';
    }
    if (tab === 'bridge') {
      return `Move ${from} across chains via Bridge.`;
    }
    return '';
  })();

  const ctaLabel = tab === 'convert' && !isLoggedIn ? 'Sign up' : 'Continue';

  return (
    <div className="ex-deeplink">
      <p className="ex-deeplink-msg">{message}</p>
      <a className="ex-cta ex-cta-secondary" href={href}>
        {ctaLabel}
      </a>
    </div>
  );
}
