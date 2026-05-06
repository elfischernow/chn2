'use client';

import { useEffect, useMemo, useState } from 'react';

import { BuySellView } from '@/components/homepage/calculator/modes/buysell/BuySellView';
import { SwapView } from '@/components/homepage/calculator/modes/swap/SwapView';
import { formatAmount, formatUsd } from '@/components/homepage/calculator/shared/format';
import type { FiatDir, RateUI } from '@/components/homepage/calculator/shared/types';
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
  buildPrivateTransferUrl,
  createTransaction,
  type EstimateResponse,
  type EstimateType,
  type RateFlow,
} from '@/lib/api/exchange';
import type { UserSession } from '@/lib/auth/dal';
import { setOpenFromFiatModeFlag } from '@/lib/auth/post-auth.client';
import { type Locale, SITE_URL } from '@/lib/config';
import { useI18n } from '@/lib/i18n/client';
import { FORCED_RECOMMENDED_PROVIDER } from '@/lib/providers/catalog';

import { AdvancedFields } from './AdvancedFields';
import { ConfirmationAgreements } from './ConfirmationAgreements';
import { ExtraIdField } from './ExtraIdField';
import { HighNetworkFeesModal } from './HighNetworkFeesModal';
import { RecipientField } from './RecipientField';
import { UsefulTips } from './UsefulTips';

import './exchange-page.css';

// Per-mode defaults — same source-of-truth as the homepage SwapWidget so
// switching tabs on either surface lands in the same canonical state.
const DEFAULTS = {
  swap: { from: 'BTC', to: 'ETH', fromNetwork: 'btc', toNetwork: 'eth', amount: '0.1' },
  buy: { from: 'USD', to: 'BTC', fromNetwork: 'usd', toNetwork: 'btc', amount: '100' },
  sell: { from: 'BTC', to: 'EUR', fromNetwork: 'btc', toNetwork: 'eur', amount: '0.01' },
} as const;

const TABS = [
  { id: 'swap', label: 'Swap' },
  { id: 'buysell', label: 'Buy / Sell' },
  { id: 'convert', label: 'Convert' },
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

  // ─── Agreement state ──────────────────────────────────────────────────
  const [agreedChangeNow, setAgreedChangeNow] = useState(false);
  const [agreedThirdParty, setAgreedThirdParty] = useState(false);

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
  // Loans/Bridge are placeholder tabs — they always render the same
  // "redirect to legacy" notice as Convert.
  const isPlaceholder = tab === 'loans' || tab === 'bridge';
  const isInline = isSwap || isFiatMode || isPrivate;

  // ─── Estimate ─────────────────────────────────────────────────────────
  // Private rides the same path as Swap (single-asset estimate via the
  // private-transfer source). Other modes use the user's flow toggle.
  const flow: RateFlow = isPrivate
    ? 'fixed-rate'
    : rate === 'fixed'
      ? 'fixed-rate'
      : 'standard';
  const driverAmount = direction === 'direct' ? fromAmount : toAmount;
  const { estimate, error, isLoading } = useExchangeEstimate({
    from,
    to,
    fromNetwork,
    toNetwork,
    amount: driverAmount,
    flow,
    type: direction,
    allowSameAsset: isPrivate,
  });
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
    // For convert/private/loans/bridge we don't reset the pair — the
    // landing message just deep-links to legacy with whatever's currently
    // in state.
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
      const fromIsFiat = !!cFrom?.isFiat;
      setFiatDir(fromIsFiat ? 'buy' : 'sell');
    }
    if (params.get('proExchangeMode') === 'true') setTab('convert');
    const recipient = params.get('recipientAddress') ?? params.get('address');
    if (recipient) setRecipientAddress(recipient);
    const extra = params.get('recipientExtraId');
    if (extra) setRecipientExtraId(extra);
    const refund = params.get('backupAddress');
    if (refund) setRefundAddress(refund);
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
  const extraIdValid =
    !extraIdRequired || recipientExtraId.trim().length > 0;

  const refundRequired = false; // Plumbing in place; no `isAnonymous` on Currency yet.
  const refundValid = !refundRequired || refundAddress.trim().length > 0;

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
    const triggersHighFees = false; // TODO: surface from estimate when available.
    if (triggersHighFees && !highFeesAccepted) {
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
        source: isFiatMode ? 'fiat' : isPrivate ? 'private-transfers' : 'site',
        authenticated: isLoggedIn,
      });
      window.location.href = `${SITE_URL}/exchange/txs/${encodeURIComponent(tx.id)}`;
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

  // ─── Deep-link helpers (Convert/Private/Loans/Bridge tabs) ────────────
  const deepLinkHref = (() => {
    if (isPrivate) {
      return buildPrivateTransferUrl({
        ticker: from,
        network: fromNetwork,
        address: recipientAddress.trim() || undefined,
        extraId: recipientExtraId.trim() || undefined,
        ...(direction === 'reverse'
          ? { toAmount: toAmount || undefined }
          : { fromAmount: fromAmount || undefined }),
      });
    }
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
      return `${SITE_URL}/pro/exchange?${qs.toString()}`;
    }
    if (tab === 'loans') return `${SITE_URL}/crypto-loan`;
    if (tab === 'bridge') return `${SITE_URL}/exchange?from=${from.toLowerCase()}&to=${to.toLowerCase()}`;
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
    if (isUnauthFiat) return t('EXCHANGE.BUTTON_TEXT_BUY') || 'Sign in to continue';
    if (isFiatMode) {
      return fiatDir === 'buy'
        ? t('EXCHANGE.BUTTON_TEXT_BUY') || `Buy ${to}`
        : t('EXCHANGE.BUTTON_TEXT_SELL') || `Sell ${from}`;
    }
    if (isPrivate) return 'Send';
    return t('EXCHANGE.BUTTON_TEXT') || 'Exchange now';
  })();

  const cashbackUsd = estimate?.cashbackUsd ?? null;
  const showCashback = !isFiatMode && cashbackUsd != null && cashbackUsd > 0;

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

          {/* ── Field stack ───────────────────────────────────────────── */}
          {isSwap && (
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
          {(isConvert || isPlaceholder) && (
            <DeepLinkPanel
              tab={tab}
              href={deepLinkHref}
              from={from}
              to={to}
              isLoggedIn={isLoggedIn}
            />
          )}

          {/* ── Rate row (Swap only — Fiat hides it) ──────────────────── */}
          {isSwap && (
            <div className="ex-rate-row">
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

          {/* ── Form fields (only on inline modes) ────────────────────── */}
          {isInline && (
            <div className="ex-form">
              <RecipientField
                label={
                  isFiatMode && fiatDir === 'sell'
                    ? `Bank account / payout address (${(toCurrency?.name ?? to)})`
                    : `Recipient ${to} address`
                }
                placeholder={`Your ${to} wallet`}
                value={recipientAddress}
                onChange={setRecipientAddress}
                addressRegex={recipientRegex}
              />
              {extraIdRequired && (
                <ExtraIdField
                  label={toCurrency?.externalIdName ?? 'Memo'}
                  value={recipientExtraId}
                  onChange={setRecipientExtraId}
                  extraIdRegex={toCurrency?.extraIdRegex ?? null}
                />
              )}
              <AdvancedFields
                refundAddress={refundAddress}
                onRefundAddressChange={setRefundAddress}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                refundRequired={refundRequired}
              />

              {showAgreements && (
                <ConfirmationAgreements
                  changenowAgreed={agreedChangeNow}
                  thirdPartyAgreed={agreedThirdParty}
                  showThirdParty={showThirdPartyAgreement}
                  onChangenowChange={setAgreedChangeNow}
                  onThirdPartyChange={setAgreedThirdParty}
                  localePrefix={localePrefix}
                />
              )}

              <button
                type="button"
                className="ex-cta"
                onClick={performSubmit}
                disabled={submit === 'sending' || !agreementsOk}
                aria-busy={submit === 'sending'}
              >
                {ctaLabel}
              </button>

              {submit !== 'idle' && submit !== 'sending' && (
                <p className="ex-cta-error" role="alert">
                  {submit}
                </p>
              )}

              {showCashback && (
                <a
                  className="ex-cashback"
                  href={isLoggedIn ? `${SITE_URL}/pro/balance` : `${localePrefix}/registration`}
                >
                  Swap with <strong>Pro</strong> and save{' '}
                  <b className="ex-cashback-amt">{formatUsd(cashbackUsd!)}</b>
                </a>
              )}
            </div>
          )}
        </section>

        <UsefulTips fixedRate={isFixedFlow} />
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
    if (tab === 'private') {
      return `Send ${from} privately on Private Transfers.`;
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
