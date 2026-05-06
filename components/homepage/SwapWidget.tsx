'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { calculatorEvents } from '@/lib/analytics/events';
import { sentryReportError } from '@/lib/sentry/report';
import { SENTRY_ERROR_TYPES } from '@/lib/sentry/constants';
import type { Currency } from '@/lib/api/currencies';
import { useSession } from '@/lib/auth/useSession';
import {
  buildExchangeUrl,
  buildPrivateTransferUrl,
  type EstimateResponse,
  type EstimateType,
  type RateFlow,
} from '@/lib/api/exchange';
import { SITE_URL } from '@/lib/config';
import { shouldReverseDisplay } from '@/lib/limit-rate';
import { FORCED_RECOMMENDED_PROVIDER } from '@/lib/providers/catalog';

import { BuySellView } from './calculator/modes/buysell/BuySellView';
import { buysellHash } from './calculator/modes/buysell/buysell.url';
import { ConvertView } from './calculator/modes/convert/ConvertView';
import { impliedFromTo } from './calculator/modes/convert/LimitPriceField/limit-math';
import { useLimitState } from './calculator/modes/convert/LimitPriceField/useLimitState';
import { convertHash } from './calculator/modes/convert/convert.url';
import { PrivateView } from './calculator/modes/private/PrivateView';
import { privateHash } from './calculator/modes/private/private.url';
import { SwapView } from './calculator/modes/swap/SwapView';
import { swapHash } from './calculator/modes/swap/swap.url';
import { formatAmount, formatUsd } from './calculator/shared/format';
import type { ConvMode, FiatDir, RateUI } from './calculator/shared/types';
import { useHashSync } from './calculator/shared/useHashSync';
import {
  amountMatchesDefault,
  currencyDefaultAmount,
  DECIMAL_RE,
  formatDefaultSeed,
} from './calculator/shared/utils';
import { LongPressButton } from './calculator/shared/LongPressButton';
import { RateLockTimer } from './calculator/shared/RateLockTimer';
import { FiatProviderStrip } from './FiatProviderStrip';
import { useExchangeEstimate } from './useExchangeEstimate';

const MODES = [
  { id: 'swap', label: 'Swap', sub: 'instant non-custodial exchange' },
  { id: 'buysell', label: 'Buy / Sell', sub: 'with card · Apple Pay · bank' },
  // The internal mode id stays `convert` so the URL hash, analytics, and
  // legacy `proExchangeMode=true` plumbing don't churn — only the user-
  // facing tab label is renamed back to "Trade", which reads truer to
  // what the surface is (Pro spot/limit/market book) than "Convert".
  { id: 'convert', label: 'Trade', sub: 'spot · limit · market · fixed' },
] as const;

const MORE_MODES = [
  { id: 'loans', label: 'Loans', sub: 'borrow against your crypto', icon: '◐' },
  { id: 'private', label: 'Private transfer', sub: 'no metadata, no trace', icon: '◇' },
  { id: 'bridge', label: 'Bridge', sub: 'move across chains', icon: '⇆' },
] as const;

// Wider than the registry's `ModeId` (swap | buysell | convert | private):
// includes the More-menu placeholders (loans, perps, bridge, stake) which
// don't have their own flows yet but are still legal values for the tab
// state. The mode-specific adapters in `MODE_REGISTRY` only cover the
// active four.
type ModeId = (typeof MODES)[number]['id'] | (typeof MORE_MODES)[number]['id'];

// Per-mode defaults — mirrors `defaultTickers` in the legacy SPA's
// `exchange-calculator/initial-state.js`. Centralized here so mode switches
// have one source of truth. Each preset carries its own network because
// the upstream estimator wants `fromCurrency` and `fromNetwork` separately
// (e.g. USDT has TRC20/ERC20/BSC/SOL variants — the ticker alone doesn't
// resolve to a real coin).
const DEFAULTS = {
  swap: { from: 'BTC', to: 'ETH', fromNetwork: 'btc', toNetwork: 'eth', amount: '0.1' },
  buy: { from: 'USD', to: 'BTC', fromNetwork: 'usd', toNetwork: 'btc', amount: '100' },
  sell: { from: 'BTC', to: 'EUR', fromNetwork: 'btc', toNetwork: 'eur', amount: '0.01' },
  // Convert mirrors swap's pair — the trade calculator only deals in
  // crypto-crypto, and a fresh entry from the buy/sell tab can leave a fiat
  // ticker in the FROM slot, which the estimator can't price.
  convert: { from: 'BTC', to: 'ETH', fromNetwork: 'btc', toNetwork: 'eth', amount: '0.1' },
  // Private transfer: same ticker on both sides — `from === to` because
  // the private-transfer flow is a one-asset wrapper (sender pays X,
  // recipient gets X minus the network/service fee). Mirrors the legacy
  // `/private-transfers` defaults: USDT on TRC-20 at 5000 (the cheapest
  // remit-style stablecoin path the page is built around). The network
  // code is `trx` because that's what our catalog uses for TRC-20 USDT
  // (`network: 'trx'` in `currencies/light`); the legacy SPA's `trc20`
  // alias is just a brand string. Using the catalog code lets the
  // `currencyByPair` lookup resolve to a real Currency record so
  // `addressRegex` / `extraIdRegex` reach the validation path.
  private: { from: 'USDT', to: 'USDT', fromNetwork: 'trx', toNetwork: 'trx', amount: '5000' },
} as const;

// Mode + direction-specific eyebrow line. Buy/Sell read differently because
// the user's mental model flips between "spend fiat to get crypto" and
// "cash out crypto to a bank".
const eyebrowFor = (mode: ModeId, fiatDir: FiatDir): string => {
  if (mode === 'buysell') {
    return fiatDir === 'buy'
      ? 'Fiat to crypto · cards, bank, Apple Pay'
      : 'Crypto to fiat · withdraw to bank or card';
  }
  const m = MODES.find((x) => x.id === mode) ?? MORE_MODES.find((x) => x.id === mode);
  return m?.sub ?? '';
};

interface SwapWidgetProps {
  currencies: readonly Currency[];
}

export function SwapWidget({ currencies }: SwapWidgetProps) {
  const { session } = useSession();
  const isLoggedIn = session !== null;

  const [mode, setMode] = useState<ModeId>('swap');
  const [moreOpen, setMoreOpen] = useState(false);
  const [rate, setRate] = useState<RateUI>('floating');
  const [fiatDir, setFiatDir] = useState<FiatDir>('buy');
  // Convert sub-mode. Owns the rate behaviour when the Convert tab is
  // active; `rate` (above) only applies on the Swap tab. Default to 'limit'
  // — the new advanced-orders flow leads with limit orders, which is the
  // distinguishing feature vs. the basic Swap tab. Market/Fixed are still
  // a click away.
  const [convMode, setConvMode] = useState<ConvMode>('limit');
  const [from, setFrom] = useState<string>(DEFAULTS.swap.from);
  const [to, setTo] = useState<string>(DEFAULTS.swap.to);
  // Networks travel alongside tickers. For single-network coins (BTC, ETH)
  // the network equals the ticker; for multi-network ones (USDT) it doesn't,
  // and without it the estimator returns nothing.
  const [fromNetwork, setFromNetwork] = useState<string>(DEFAULTS.swap.fromNetwork);
  const [toNetwork, setToNetwork] = useState<string>(DEFAULTS.swap.toNetwork);

  const [direction, setDirection] = useState<EstimateType>('direct');
  // Seed FROM amount from the catalog row for the initial currency. The
  // hardcoded `DEFAULTS.swap.amount` is just a fallback for the (rare)
  // catalog that ships without a `default_value` — without this lazy
  // lookup the seeded "0.1" would mismatch BTC's actual catalog default
  // (0.01 via `manual_default_value`) and the wasDefault check in
  // `onPickFrom` would treat the seed as user input and refuse to
  // re-default on currency switch.
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
  // User-picked fiat provider type. `null` means defer to whatever the
  // upstream marks as recommended for the current pair.
  const [providerType, setProviderType] = useState<string | null>(null);
  // Recipient wallet address for the Private send mode. Lives at the widget
  // level so the URL-hash sync below can roundtrip it across reloads. We
  // deliberately do NOT validate per-chain here — the legacy
  // `/private-transfers` landing runs the proper address check (network-
  // specific regex, EIP-55 case for ETH-likes, base58 for BTC, etc.); the
  // homepage calculator just collects the value and forwards it.
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  // Memo / destination tag / payment ID for chains that require one
  // alongside the address (XRP → "Destination Tag", TON-USDT → "Memo",
  // Cosmos chains → "Memo"). The field is rendered only when the active
  // currency's `hasExternalId` flag is true; we still keep state at the
  // widget level so the URL-hash sync can roundtrip it the same way it
  // does the address.
  const [recipientExtraId, setRecipientExtraId] = useState<string>('');
  // Submission state for the private-transfer Send button. The CTA POSTs
  // to our `/api/transactions` proxy (which forwards to vip-api), then
  // redirects to the legacy transaction page on success. `null` →
  // idle; `'sending'` → in flight; `string` → error message to surface.
  const [privateSubmit, setPrivateSubmit] = useState<'idle' | 'sending' | string>('idle');
  const [authSubmit, setAuthSubmit] = useState<'idle' | 'sending' | string>('idle');

  const isFiatMode = mode === 'buysell';
  const isConvert = mode === 'convert';
  const isPrivate = mode === 'private';
  const pairTag = `${from}-${to}`;

  // Currency lookups — needed by `shouldReverseDisplay` for the `isStable`
  // flag and by anything else that needs more than just the ticker. Memoize
  // so the lookup doesn't traverse the (~1300-entry) currency list per
  // render.
  //
  // Keyed by `(ticker, network)` because the same ticker spans multiple
  // chains (USDT on TRC20/ERC20/BSC/SOL/TON, XRP on its own chain + BSC,
  // etc.) and a ticker-only key would let one variant overwrite another in
  // the map. That mattered for `hasExternalId` in particular: native XRP
  // needs a Destination Tag, the BSC wrapper doesn't, and the picker can
  // legitimately select either.
  const currencyByPair = useMemo(() => {
    const m = new Map<string, Currency>();
    for (const c of currencies) {
      m.set(`${c.currentTicker.toUpperCase()}:${c.network}`, c);
    }
    return m;
  }, [currencies]);
  const fromCurrency = currencyByPair.get(`${from}:${fromNetwork}`);
  const toCurrency = currencyByPair.get(`${to}:${toNetwork}`);

  // Resolve the catalog-provided default amount for the active FROM
  // currency. Used to (a) seed `fromAmount` when no user input is in
  // play and (b) decide whether the current value should be treated as
  // "default" (skipped from the URL hash, replaced on currency switch)
  // or "user-typed" (preserved everywhere). Mirrors the legacy
  // `defaultAmountSelector(from.ticker)` flow.
  const fromDefaultAmount = currencyDefaultAmount(fromCurrency);

  // Pick a FROM currency from any of the per-mode views. Wraps the raw
  // setters so a switch carries over the user's amount when they typed
  // it themselves, but lands the new currency's catalog default when the
  // existing value was just a previous default. Without this every
  // currency change would clobber custom input — exactly what the
  // legacy actions.js avoided by routing the URL `amount` through
  // `selectCurrencyFrom` instead of the reducer's fallback.
  const onPickFrom = (c: Currency) => {
    const newDef = currencyDefaultAmount(c);
    const wasDefault = amountMatchesDefault(fromAmount, fromDefaultAmount);
    setFrom(c.currentTicker.toUpperCase());
    setFromNetwork(c.network);
    if (wasDefault && newDef != null) {
      setFromAmount(formatDefaultSeed(newDef));
    }
  };

  const moreRef = useRef<HTMLDivElement>(null);

  // In Convert, the sub-mode toggle owns rate behaviour: market/limit are
  // floating quotes (limit still wants a live market rate to compare
  // against), fixed locks the rate. Outside Convert, the explicit Fixed/
  // Floating toggle wins. Private always quotes a fixed rate — the
  // recipient amount must be deterministic when the user signs off on
  // the transfer, and the upstream supports same-asset estimates only
  // on the fixed-rate path with `useRateId=true`.
  const flow: RateFlow = isPrivate
    ? 'fixed-rate'
    : isConvert
      ? convMode === 'fixed'
        ? 'fixed-rate'
        : 'standard'
      : rate === 'fixed'
        ? 'fixed-rate'
        : 'standard';
  // Drive the estimate from the side the user is editing. Private mode
  // rides the same path as Swap/Convert: same-asset queries opt out of
  // the hook's cross-asset guard via `allowSameAsset`, the API route
  // forwards `source=private-transfers`, and the upstream returns a
  // real fee + a rateId we bind into the transaction at submit.
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

  // Derived from `flow` so Convert+Fixed shares the same lock affordance
  // as Swap+Fixed without restating the rule per surface. The rate-id
  // refresh runs silently every `REFRESH_MS` (2 min) inside
  // `useExchangeEstimate`; the countdown rendered on the rate row reads
  // `estimate.validUntil` so the user sees how long the locked rate is
  // good for. Private transfer intentionally hides the timer (the
  // recipient-gets line is the source of truth there) and fiat doesn't
  // use a rateId — both opt out at the render site below.
  const isFixedFlow = flow === 'fixed-rate';

  // Sync the FOLLOWER field with API output. We don't push back into the
  // edited field — that would fight the user's keystrokes. Track the
  // estimate identity in render so we can mirror its value into the
  // appropriate input without bouncing through an effect, which would
  // trigger a second render for what is just derived state.
  const [estimateRef, setEstimateRef] = useState<EstimateResponse | null>(null);
  if (estimate && estimate !== estimateRef) {
    setEstimateRef(estimate);
    if (direction === 'direct' && estimate.toAmount != null) {
      setToAmount(formatAmount(estimate.toAmount));
    } else if (direction === 'reverse' && estimate.fromAmount != null) {
      setFromAmount(formatAmount(estimate.fromAmount));
    }
  }

  // Initial-load gate: cover the whole calculator with a shimmer until the
  // first estimate has arrived (or an error has surfaced). `estimateRef`
  // starts at null on hydration and flips on the first successful response,
  // so it doubles as our "have we ever rendered real data?" flag without
  // a separate effect or ref. We deliberately exit on error too — sitting
  // on a skeleton over a permanent error would feel broken. Private mode
  // doesn't drive an estimate (single-asset flow, no rate row) so the
  // skeleton would never clear — exit immediately on `isPrivate`.
  const isInitialLoading = !isPrivate && estimateRef === null && !error;

  // Live rate per unit of FROM. Same number powers the Swap rate line and
  // the Convert "market rate:" reference; the calling site picks how to
  // frame it.
  const marketRate = useMemo(() => {
    if (!estimate?.toAmount || !estimate.fromAmount) return null;
    return estimate.toAmount / estimate.fromAmount;
  }, [estimate]);

  // Default display orientation for the current pair: stables and the
  // PRIORITY_LIMIT_RATE_COINS list decide which side is the natural base.
  // E.g. BTC↔USDT → quote as "1 BTC = X USDT" (don't reverse). The user
  // can still override via the reverse button on the limit-price field.
  const defaultInverse = shouldReverseDisplay(fromCurrency, toCurrency);
  // Limit-price state + derivations live in their own hook now. Called
  // unconditionally (hooks rule) — the cost is two `useState` cells; the
  // benefit is the user's typed price + reverse-toggle survive a tab
  // switch back into Convert.
  const limit = useLimitState({ pairTag, marketRate, defaultInverse });

  // `isLimit` is declared further down (it lives inside the limit-field
  // derivation block); recompute the same boolean here so the rate-line
  // memo can react to sub-mode toggles without lifting the entire block.
  const rateLineIsLimit = isConvert && convMode === 'limit';
  const rateLine = useMemo(() => {
    if (marketRate == null) return null;
    if (isConvert) {
      // Always "≈" in Convert — this is the reference rate, not a quoted
      // commitment. The sub-mode toggle (Fixed / Limit) communicates
      // commitment elsewhere. In Limit mode we mirror the price field's
      // orientation so the user can compare their typed price to the
      // reference in the same units (1 ETH ≈ 0.030 BTC ↔ 1 BTC ≈ 33 ETH).
      if (rateLineIsLimit && limit.isInverse && marketRate > 0) {
        return `Market rate: 1 ${to} ≈ ${formatAmount(1 / marketRate)} ${from}`;
      }
      return `Market rate: 1 ${from} ≈ ${formatAmount(marketRate)} ${to}`;
    }
    const sign = rate === 'fixed' ? '=' : '≈';
    return `1 ${from} ${sign} ${formatAmount(marketRate)} ${to}`;
  }, [marketRate, from, to, rate, isConvert, rateLineIsLimit, limit.isInverse]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ─── URL hash state sync ────────────────────────────────────
  // Persist the calculator's tab/sub-mode/currencies/amount/provider in
  // `window.location.hash` so a reload or shared link reopens the same
  // state. We use the fragment (not query string) on purpose — the home
  // page is statically rendered, fragment changes don't trigger Next.js
  // routing, and the value never reaches the server log.
  useHashSync({
    read: (params) => {
      // Top-level tab — owned by the orchestrator, not by any single mode.
      const m = params.get('mode');
      if (m === 'swap' || m === 'buysell' || m === 'convert' || m === 'private') setMode(m);

      // Common slice — every mode has these. Will move into per-mode state
      // hooks in step 4+; for now it stays inline so the setters in scope
      // can be called directly. Each setter applies the same normalization
      // the input path uses (uppercase ticker, lowercase network,
      // decimal-validated amount).
      const f = params.get('from');
      if (f) setFrom(f.toUpperCase());
      const t = params.get('to');
      if (t) setTo(t.toUpperCase());
      const fn = params.get('fromNetwork');
      if (fn) setFromNetwork(fn.toLowerCase());
      const tn = params.get('toNetwork');
      if (tn) setToNetwork(tn.toLowerCase());
      const d = params.get('dir');
      const dirVal: EstimateType | null = d === 'direct' || d === 'reverse' ? d : null;
      if (dirVal) setDirection(dirVal);
      const a = params.get('amount');
      // Validate with the same gate the input uses — never seed from
      // hash with anything that wouldn't survive a manual keystroke.
      if (a != null && DECIMAL_RE.test(a)) {
        if (dirVal === 'reverse') setToAmount(a);
        else setFromAmount(a);
      }

      // Mode-specific slices — delegate to per-mode adapters. Each adapter
      // only reads the params unique to its mode; running all four is safe
      // because their key sets don't overlap, and matches the prior
      // behaviour of dispatching every recognized param regardless of the
      // active tab (so cross-mode state survives a tab switch).
      const sw = swapHash.parse(params);
      if (sw.rate) setRate(sw.rate);
      const bs = buysellHash.parse(params);
      if (bs.fiatDir) setFiatDir(bs.fiatDir);
      if (bs.provider) setProviderType(bs.provider);
      const cv = convertHash.parse(params);
      if (cv.sub) setConvMode(cv.sub);
      const pv = privateHash.parse(params);
      if (pv.address !== undefined) setRecipientAddress(pv.address);
      if (pv.extraId !== undefined) setRecipientExtraId(pv.extraId);
    },
    write: () => {
      // "Fresh state" — active mode is swap and every user-driven field
      // still holds its initial useState value. Returning `null` clears
      // the URL so a first-load visit to `/` stays at `/` (no `#…`, no
      // `?mode=1`). Any divergence triggers the full hash write below.
      //
      // Note: `toAmount` is intentionally NOT in the check. It's
      // populated by the estimate-sync side-effect (asynchronously,
      // without user input) so testing it === '' would fail the moment
      // the first estimate lands and pin the URL forever after. Only
      // the *driving* amount (`fromAmount` here, since direction must
      // be 'direct' to even reach this branch) reflects user intent.
      // The driver is the side the user is actually editing — FROM in
      // direct, TO in reverse. Compare it against that side's catalog
      // default so a freshly-seeded value drops out of both the URL and
      // the "fresh state" check (matches legacy `selectCurrencyFrom` →
      // `exchange` flow: defaults never travel as `?amount=`).
      const drivingAmount = direction === 'direct' ? fromAmount : toAmount;
      const driverDefault =
        direction === 'direct' ? fromDefaultAmount : currencyDefaultAmount(toCurrency);
      const drivingIsDefault =
        drivingAmount === '' ||
        drivingAmount === DEFAULTS.swap.amount ||
        amountMatchesDefault(drivingAmount, driverDefault);

      if (
        mode === 'swap' &&
        from === DEFAULTS.swap.from &&
        to === DEFAULTS.swap.to &&
        fromNetwork === DEFAULTS.swap.fromNetwork &&
        toNetwork === DEFAULTS.swap.toNetwork &&
        direction === 'direct' &&
        drivingIsDefault &&
        rate === 'floating' &&
        providerType === null &&
        recipientAddress === '' &&
        recipientExtraId === ''
      ) {
        return null;
      }

      const params = new URLSearchParams();
      params.set('mode', mode);

      // Common slice — same set of keys regardless of mode.
      params.set('from', from);
      params.set('to', to);
      if (fromNetwork) params.set('fromNetwork', fromNetwork);
      if (toNetwork) params.set('toNetwork', toNetwork);
      // Skip `amount` when it matches the catalog default — only user-
      // typed values should land in the shareable URL, mirroring legacy
      // `actions.js` exchange() which gates `params.amount` on
      // `parseFloat(amount) !== parseFloat(defaultAmount)`.
      if (drivingAmount && !drivingIsDefault) params.set('amount', drivingAmount);
      params.set('dir', direction);

      // Mode-specific slice — only the active mode's adapter writes. The
      // prior version emitted `provider=` regardless of mode, but
      // `providerType` is only ever set under buysell (every other mode's
      // `applyDefaults` clears it), so scoping it under buysell here is
      // a no-op in practice.
      let modeOut: Record<string, string> = {};
      if (mode === 'swap') modeOut = swapHash.write({ rate });
      else if (mode === 'buysell')
        modeOut = buysellHash.write({ fiatDir, provider: providerType ?? undefined });
      else if (mode === 'convert') modeOut = convertHash.write({ sub: convMode });
      else if (mode === 'private')
        modeOut = privateHash.write({ address: recipientAddress, extraId: recipientExtraId });
      for (const [k, v] of Object.entries(modeOut)) params.set(k, v);

      return params;
    },
    writeDeps: [
      mode,
      convMode,
      rate,
      fiatDir,
      from,
      to,
      fromNetwork,
      toNetwork,
      fromAmount,
      toAmount,
      direction,
      providerType,
      recipientAddress,
      recipientExtraId,
    ],
  });

  const flip = () => {
    setFrom(to);
    setTo(from);
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
    calculatorEvents.switchDirection();
    // No need to clear limit price here — the pair tag stops matching once
    // from/to swap, so `limitPx` reads as '' on the next render.
  };

  // Apply the canonical defaults for a (mode, direction) pair. Called when
  // the user changes mode/direction so the form lands in a sensible state
  // instead of carrying over a now-incompatible ticker (e.g. ETH on the FROM
  // side after switching to fiat-buy).
  const applyDefaults = (preset: keyof typeof DEFAULTS) => {
    const d = DEFAULTS[preset];
    setFrom(d.from);
    setTo(d.to);
    setFromNetwork(d.fromNetwork);
    setToNetwork(d.toNetwork);
    // Prefer the FROM currency's catalog default over the hardcoded
    // mode-level fallback. The fallback (`d.amount`) is only used when
    // upstream omits a default for that currency — keeps swap working
    // even if the catalog rolls out without the new field populated.
    const presetFromCurrency = currencyByPair.get(`${d.from}:${d.fromNetwork}`);
    const presetDefault = currencyDefaultAmount(presetFromCurrency);
    setFromAmount(presetDefault != null ? formatDefaultSeed(presetDefault) : d.amount);
    setToAmount('');
    setDirection('direct');
    // Different pair → different provider mix → defer to upstream's pick.
    setProviderType(null);
    // Limit price tag will mismatch the new pair on next render and read
    // as '' automatically — no explicit reset needed.
  };

  const onModeSwitch = (next: ModeId) => {
    setMode(next);
    if (next === 'swap' || next === 'buysell' || next === 'convert') {
      calculatorEvents.tabChange(next === 'buysell' ? (fiatDir === 'buy' ? 'buy' : 'sell') : (next as 'swap' | 'convert'));
    }
    if (next === 'swap') applyDefaults('swap');
    else if (next === 'buysell') applyDefaults(fiatDir === 'buy' ? 'buy' : 'sell');
    else if (next === 'convert') applyDefaults('convert');
    else if (next === 'private') {
      applyDefaults('private');
      // Private mode reads the TO field as the canonical "recipient gets"
      // amount; `applyDefaults` only seeds `fromAmount`, so promote the
      // same default to `toAmount` and flip the direction so the deep-link
      // builder picks it up. Same catalog-vs-fallback resolution as
      // `applyDefaults` — keep the two sides in step.
      const privDef = DEFAULTS.private;
      const privCurrency = currencyByPair.get(`${privDef.from}:${privDef.fromNetwork}`);
      const privDefault = currencyDefaultAmount(privCurrency);
      setToAmount(privDefault != null ? formatDefaultSeed(privDefault) : privDef.amount);
      setDirection('reverse');
    }
    // Other More-menu modes left alone — they're not real flows yet.
  };

  const onFiatDirSwitch = (next: FiatDir) => {
    setFiatDir(next);
    applyDefaults(next === 'buy' ? 'buy' : 'sell');
  };

  // Convert+Limit gates the You-buy field's display value (we show the
  // implied fill at the user's limit price instead of the live market
  // estimate) and unlocks the LimitPriceField below the field stack.
  const isLimit = isConvert && convMode === 'limit';
  // Implied "You buy" amount at the user's limit price. Mirrors the legacy
  // `amountTo = amountFrom * directPrice` calc — keeps the receive field
  // honest about what the order would actually fill at, instead of
  // showing whatever the live market estimate happens to be.
  const limitImpliedToNum = isLimit ? impliedFromTo(fromAmount, limit.directNum) : null;
  const limitImpliedTo: string | null =
    limitImpliedToNum != null ? formatAmount(limitImpliedToNum) : null;

  // Fiat-mode override for "You get" — must mirror whichever provider the
  // FiatProviderStrip is currently displaying. Two paths:
  //   1. User picked a specific provider (`providerType !== null`) — show
  //      that provider's quote.
  //   2. Default state — pin to FORCED_RECOMMENDED_PROVIDER (Guardarian)
  //      so the strip's "Guardarian + 0.001217 BTC" matches the You-get
  //      field above. Falling back to `estimate.toAmount` would show the
  //      upstream-cheapest provider's amount, which can differ from
  //      Guardarian's by 1-3% — visible mismatch for the user.
  const fiatProviderTo: string | null = (() => {
    if (!isFiatMode || !estimate?.providers?.length) return null;
    const explicit = providerType
      ? estimate.providers.find((x) => x.type === providerType)
      : null;
    if (explicit?.estimatedAmount != null) return formatAmount(explicit.estimatedAmount);
    if (providerType) return null; // user picked a provider with no quote — let estimate.toAmount handle
    const recommended =
      estimate.providers.find((x) => x.type === FORCED_RECOMMENDED_PROVIDER) ??
      estimate.providers[0];
    if (recommended?.estimatedAmount == null) return null;
    return formatAmount(recommended.estimatedAmount);
  })();

  const exchangeHref = isPrivate
    ? buildPrivateTransferUrl({
        ticker: from,
        network: fromNetwork,
        // Forward whichever side the user actually typed — direction
        // tracks that. The legacy page accepts either `amountTo` or
        // `amount` and re-derives the other client-side, so we don't
        // need to compute the counterpart ourselves before redirecting.
        ...(direction === 'reverse'
          ? { toAmount: toAmount || undefined }
          : { fromAmount: fromAmount || undefined }),
        address: recipientAddress.trim() || undefined,
        // Forward the memo/destination-tag only when the active currency
        // actually needs one — otherwise the legacy page would surface a
        // recipient-extra-id field that doesn't apply.
        extraId: toCurrency?.hasExternalId ? recipientExtraId.trim() || undefined : undefined,
      })
    : buildExchangeUrl({
        from,
        to,
        // Pass the user's *driver* amount in its native direction so the
        // legacy page boots with the same field they were editing here.
        // `direction` === 'reverse' surfaces as `&amountTo=…` (which the
        // legacy SPA also auto-promotes to fixed-rate — see
        // `legacy_exchange_routing.md`).
        amount: direction === 'direct' ? fromAmount : undefined,
        toAmount: direction === 'reverse' ? toAmount : undefined,
        flow,
        fiatMode: isFiatMode,
        proMode: isConvert,
      });

  const ctaLabel = isFiatMode
    ? fiatDir === 'buy'
      ? `Buy ${to}`
      : `Sell ${from}`
    : isConvert
      ? convMode === 'limit'
        ? 'Place limit order'
        : 'Continue'
      : isPrivate
        ? privateSubmit === 'sending'
          ? 'Sending…'
          : 'Send'
        : 'Exchange';

  // Address validity for the private-mode submit gate. Re-uses the same
  // catalog regex PrivateView surfaces visually, so a click on Send when
  // the field is empty or malformed bails locally before the network
  // round-trip — and the upstream's `INVALID_ADDRESS` 400 stays an edge
  // case for chain-specific checksum failures.
  const privateAddressValid = (() => {
    if (!isPrivate) return true;
    const trimmed = recipientAddress.trim();
    if (!trimmed) return false;
    const raw = toCurrency?.addressRegex;
    if (!raw) return true;
    try {
      return new RegExp(raw).test(trimmed);
    } catch {
      return true;
    }
  })();

  const onPrivateSendClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isPrivate) return;
    e.preventDefault();
    if (privateSubmit === 'sending') return;
    if (!privateAddressValid) {
      setPrivateSubmit('Enter a valid recipient address.');
      return;
    }
    // Bind the transaction to the estimate's fixed-rate quote — the
    // `rateId` ties the upstream price to this submission, refreshed
    // every 2 min (REFRESH_MS in `useExchangeEstimate`) so the value
    // here is always within the upstream's `validUntil` window.
    const rateId = estimate?.rateId;
    if (!rateId || estimate == null) {
      setPrivateSubmit('Quote is loading — try again in a moment.');
      return;
    }
    setPrivateSubmit('sending');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCurrency: from.toLowerCase(),
          toCurrency: to.toLowerCase(),
          fromNetwork,
          toNetwork,
          flow: 'fixed-rate',
          // Direction echoes the side the user typed; the upstream uses
          // it together with `rateId` to settle the opposite side at the
          // quoted rate. Driver amount = whichever side they typed —
          // the upstream returns the counterpart in its response.
          type: direction,
          rateId,
          ...(direction === 'direct'
            ? { fromAmount: Number(fromAmount) }
            : { toAmount: Number(toAmount) }),
          address: recipientAddress.trim(),
          extraId:
            toCurrency?.hasExternalId && recipientExtraId.trim()
              ? recipientExtraId.trim()
              : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { id?: string; error?: string; message?: string }
        | null;
      if (!res.ok || !data?.id) {
        setPrivateSubmit(data?.message || 'Transaction failed. Try again.');
        return;
      }
      window.location.href = `${SITE_URL}/exchange/txs/${encodeURIComponent(data.id)}`;
    } catch {
      setPrivateSubmit('Network error. Try again.');
    }
  };

  const onAuthCreateTransaction = useCallback(async () => {
    if (!isLoggedIn || authSubmit === 'sending') return;
    const rateId = estimate?.rateId;
    if (!rateId && flow === 'fixed-rate') {
      setAuthSubmit('Quote is loading — try again in a moment.');
      return;
    }
    setAuthSubmit('sending');
    try {
      const payload: Record<string, unknown> = {
        fromCurrency: from.toLowerCase(),
        toCurrency: to.toLowerCase(),
        fromNetwork,
        toNetwork,
        flow,
        type: direction,
      };
      if (rateId) payload.rateId = rateId;
      if (direction === 'direct') payload.fromAmount = fromAmount;
      else payload.toAmount = toAmount;
      if (isFiatMode) payload.source = 'fiat';

      const res = await fetch('/api/auth/v1.1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { id?: string; message?: string }
        | null;
      if (!res.ok || !data?.id) {
        setAuthSubmit(data?.message || 'Transaction failed. Try again.');
        return;
      }
      window.location.href = `${SITE_URL}/exchange/txs/${encodeURIComponent(data.id)}`;
    } catch {
      setAuthSubmit('Network error. Try again.');
    }
  }, [isLoggedIn, authSubmit, estimate, flow, from, to, fromNetwork, toNetwork, direction, fromAmount, toAmount, isFiatMode]);

  // Reset the submission error the moment the user touches the form
  // again, so a stale "address invalid" doesn't linger after they fixed
  // it. Synchronizing component state with an external invariant
  // (user-edited inputs invalidate the previous submit's verdict) is
  // the canonical case the rule lets through with the disable below.
  useEffect(() => {
    if (privateSubmit !== 'idle' && privateSubmit !== 'sending') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrivateSubmit('idle');
    }
    if (authSubmit !== 'idle' && authSubmit !== 'sending') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthSubmit('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipientAddress,
    recipientExtraId,
    fromAmount,
    toAmount,
    from,
    to,
    fromNetwork,
    toNetwork,
  ]);

  // Skeleton shows over the FOLLOWER field for the entire loading window —
  // the previous value would otherwise flash stale until the new estimate
  // resolves.
  const showSkeletonTo = isLoading && direction === 'direct';
  const showSkeletonFrom = isLoading && direction === 'reverse';

  // Surface estimator failures to telemetry once per (pair, error) instance
  // so dashboards count "BTC→ETH unavailable" rather than every keystroke
  // in a degraded session. The fingerprint groups identical failures.
  useEffect(() => {
    if (!error) return;
    calculatorEvents.pairUnavailable(from, to);
    sentryReportError({
      error: new Error(error.message || error.error || 'estimate failed'),
      type: SENTRY_ERROR_TYPES.CALCULATOR_ERROR,
      tags: { from_to: `${from}->${to}`, flow },
      fingerprint: ['calculator', from, to, error.error || 'unknown'],
    });
  }, [error, from, to, flow]);

  // Out-of-range hint. When the upstream returns a successful estimate but
  // marks the amount as below `minAmount` / above `maxAmount`, surface a
  // clickable button with the exact boundary value so the user can swap
  // their input for it in one tap. Beats showing a generic error and
  // forcing them to guess the right number.
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

  const applyBoundary = (value: number) => {
    setDirection('direct');
    setFromAmount(String(value));
  };

  // Pro upsell — server returns `cashbackUsd` (NOW-token cashback × cached
  // NOW→USD price). Hide entirely when the pair has no Pro benefit; keep
  // the slot mounted with a skeleton while computing so it doesn't pop in
  // mid-thought.
  const cashbackUsd = estimate?.cashbackUsd ?? null;
  const proValuable = cashbackUsd != null && cashbackUsd > 0;
  const proSlotEligible =
    estimate == null || (estimate.cashbackUsd != null && estimate.cashbackUsd > 0);
  const showSkeletonPro = isLoading && proSlotEligible;
  // Hide the cashback upsell in fiat mode (provider strip takes its place)
  // and in Convert (the "Join Pro for free" CTA below sits in that slot —
  // a different hook for an audience that's already evaluating a Pro
  // feature).
  const showPro = !isFiatMode && !isConvert && (showSkeletonPro || proValuable);

  const onProClick = () => {
    calculatorEvents.exchangeClick(`pro:${from}`, to);
  };

  return (
    <div className="widget" data-rate-mode={rate} data-initial-loading={isInitialLoading || undefined}>
      {isInitialLoading && <span className="widget-skel" aria-hidden />}
      <div className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="mode-tab"
            // `aria-pressed` is the right attribute for a togglable button —
            // `aria-selected` requires a role that conveys list/tab semantics
            // (option/tab/treeitem). The CSS hooks via `[aria-pressed]`
            // already match the same value set we used to write into
            // `[aria-selected]`.
            aria-pressed={mode === m.id}
            onClick={() => onModeSwitch(m.id)}
          >
            {m.label}
          </button>
        ))}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <button
            className="mode-tab more"
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((o) => !o);
            }}
          >
            More
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5l3 3 3-3" />
            </svg>
          </button>
          <div className="mode-menu" data-open={moreOpen}>
            {MORE_MODES.map((m) => (
              <div
                key={m.id}
                className="item"
                onClick={() => {
                  onModeSwitch(m.id);
                  setMoreOpen(false);
                }}
              >
                <span className="ic">{m.icon}</span>
                <span>
                  {m.label}
                  <span className="sub">{m.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eyebrow caption — one line of context describing what the active
          mode is for. Restored across all tabs (Swap, Buy/Sell, Convert)
          for symmetry: the Convert caption ("advanced orders · balance
          convert") clarifies it's the Pro calculator surface, not just a
          second flavour of Swap. */}
      <div className="mode-sub">{eyebrowFor(mode, fiatDir)}</div>

      <div className="swap-stack" data-mode={mode}>
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
              // Mirror FROM and TO so the rest of the widget (pair tag,
              // hash sync, deep-link builder) keeps treating this like
              // a single-asset flow without per-mode special cases.
              const tk = c.currentTicker.toUpperCase();
              setFrom(tk);
              setTo(tk);
              setFromNetwork(c.network);
              setToNetwork(c.network);
              // Clear the memo when the chain changes — a destination
              // tag for XRP makes no sense on TON-USDT, and silently
              // forwarding stale tags into the deep link would land on
              // the wrong account.
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

        {mode === 'swap' && (
          <SwapView
            currencies={currencies}
            from={from}
            fromNetwork={fromNetwork}
            fromAmount={fromAmount}
            to={to}
            toNetwork={toNetwork}
            toAmount={toAmount}
            hasError={Boolean(error) || Boolean(outOfRange)}
            showSkeletonFrom={showSkeletonFrom}
            showSkeletonTo={showSkeletonTo}
            isFixedFlow={isFixedFlow}
            withdrawalFee={estimate?.withdrawalFee ?? null}
            onSelectFrom={onPickFrom}
            onSelectTo={(c) => {
              setTo(c.currentTicker.toUpperCase());
              setToNetwork(c.network);
            }}
            onFromAmountChange={(value) => {
              setDirection('direct');
              setFromAmount(value);
            }}
            onToAmountChange={(value) => {
              // Typing "I want X TO" implies the user needs a rate that
              // doesn't drift — auto-promote to fixed-rate, same UX as
              // the prod calculator.
              setDirection('reverse');
              setRate('fixed');
              setToAmount(value);
            }}
            onFlip={flip}
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
            hasError={Boolean(error) || Boolean(outOfRange)}
            showSkeletonFrom={showSkeletonFrom}
            showSkeletonTo={showSkeletonTo}
            isFixedFlow={isFixedFlow}
            isLimit={isLimit}
            limitImpliedTo={limitImpliedTo}
            withdrawalFee={estimate?.withdrawalFee ?? null}
            marketRate={marketRate}
            limit={limit}
            onSelectFrom={onPickFrom}
            onSelectTo={(c) => {
              setTo(c.currentTicker.toUpperCase());
              setToNetwork(c.network);
            }}
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
            hasError={Boolean(error) || Boolean(outOfRange)}
            showSkeletonFrom={showSkeletonFrom}
            showSkeletonTo={showSkeletonTo}
            fiatProviderTo={fiatProviderTo}
            onSelectFrom={onPickFrom}
            onSelectTo={(c) => {
              setTo(c.currentTicker.toUpperCase());
              setToNetwork(c.network);
            }}
            onFromAmountChange={(value) => {
              setDirection('direct');
              setFromAmount(value);
            }}
            onToAmountChange={(value) => {
              // Fiat-mode TO is read-only in the UI, but keep this wired
              // so the prop contract matches the other modes — never
              // actually fires in practice.
              setDirection('reverse');
              setToAmount(value);
            }}
          />
        )}
      </div>

      {!isPrivate && (
      <div className="swap-rate">
        <span className="swap-rate-text">
          {outOfRange ? (
            // Out-of-range hint — clickable to fill the input with the
            // exact boundary so the user doesn't have to type the magic
            // number themselves.
            <button
              type="button"
              className="swap-rate-bound"
              onClick={() => applyBoundary(outOfRange.value)}
            >
              {outOfRange.kind === 'min' ? 'Min' : 'Max'}:{' '}
              <strong>
                {formatAmount(outOfRange.value)} {from}
              </strong>
            </button>
          ) : error ? (
            // Errors land here rather than inside the field so they don't
            // grow the field's height. The field still tints red via
            // `data-has-error` for visual context.
            <span className="swap-rate-err" role="alert">
              {error.message || error.error}
            </span>
          ) : isLoading ? (
            <span className="swap-skel swap-skel-line" aria-hidden />
          ) : (
            <>
              {rateLine ?? (isConvert ? `Market rate: 1 ${from} ≈ … ${to}` : `1 ${from} ≈ … ${to}`)}
            </>
          )}
          {/* Lock + countdown for fixed-rate flows. Reads `validUntil`
              from the same estimate that drives the rate text, so the
              two stay synchronised. Private transfer hides the timer by
              skipping this entire branch (`!isPrivate` above); fiat hides
              it because the provider strip — not the rate row — is its
              source of truth, and there's no rateId to commit there. */}
          {isFixedFlow && !isFiatMode && estimate?.validUntil && !error && !outOfRange && !isLoading && (
            <RateLockTimer validUntil={estimate.validUntil} />
          )}
        </span>
        {isFiatMode ? (
          <div className="rate-toggle">
            <button type="button" aria-pressed={fiatDir === 'buy'} onClick={() => onFiatDirSwitch('buy')}>
              Buy
            </button>
            <button type="button" aria-pressed={fiatDir === 'sell'} onClick={() => onFiatDirSwitch('sell')}>
              Sell
            </button>
          </div>
        ) : isConvert ? (
          <div className="rate-toggle">
            <button type="button" aria-pressed={convMode === 'market'} onClick={() => setConvMode('market')}>Market</button>
            <button type="button" aria-pressed={convMode === 'fixed'} onClick={() => setConvMode('fixed')}>Fixed</button>
            <button type="button" aria-pressed={convMode === 'limit'} onClick={() => setConvMode('limit')}>Limit</button>
          </div>
        ) : (
          <div className="rate-toggle">
            <button type="button" aria-pressed={rate === 'fixed'} onClick={() => setRate('fixed')}>Fixed</button>
            <button type="button" aria-pressed={rate === 'floating'} onClick={() => setRate('floating')}>Floating</button>
          </div>
        )}
      </div>
      )}

      {isPrivate && (() => {
        // The upstream now quotes same-asset on the fixed-rate path
        // (with `useRateId=true`), so the rate row reads from the real
        // estimate response — no local approximation. The flip button
        // toggles which side is editable; the OTHER side comes from
        // `estimate.fromAmount` (when reverse) or `estimate.toAmount`
        // (when direct). The rate-id refresh (every 2 min) runs silently
        // in `useExchangeEstimate` so the quote stays inside the
        // upstream's validity envelope without surfacing a countdown.
        const computedLabel =
          direction === 'direct' ? 'Recipient gets' : 'Total with fees';
        const computed =
          direction === 'direct'
            ? estimate?.toAmount ?? null
            : estimate?.fromAmount ?? null;
        return (
          <div className="swap-rate">
            <span className="swap-rate-text">
              {error ? (
                <span className="swap-rate-err" role="alert">
                  {error.message || error.error}
                </span>
              ) : isLoading || computed == null ? (
                <span className="swap-skel swap-skel-line" aria-hidden />
              ) : (
                <>
                  {computedLabel}:{' '}
                  <strong>
                    {formatAmount(computed)} {from}
                  </strong>
                </>
              )}
            </span>
            <button
              type="button"
              className="lim-reverse"
              onClick={() =>
                setDirection((d) => (d === 'reverse' ? 'direct' : 'reverse'))
              }
              aria-label="Swap recipient amount and total positions"
              title="Swap fields"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7 4v14" />
                <path d="m3 8 4-4 4 4" />
                <path d="M17 20V6" />
                <path d="m21 16-4 4-4-4" />
              </svg>
            </button>
          </div>
        );
      })()}

      {isConvert && isLoggedIn ? (
        <LongPressButton
          onComplete={onAuthCreateTransaction}
          disabled={authSubmit === 'sending'}
          busy={authSubmit === 'sending'}
        >
          {convMode === 'limit' ? 'Hold to place limit order' : 'Hold to convert'}
        </LongPressButton>
      ) : (
        <a
          className="swap-cta"
          href={
            !isLoggedIn && (isFiatMode || isConvert)
              ? '/registration'
              : exchangeHref
          }
          onClick={
            isPrivate
              ? onPrivateSendClick
              : isLoggedIn && (isFiatMode || isConvert)
                ? (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    onAuthCreateTransaction();
                  }
                : undefined
          }
          data-busy={(privateSubmit === 'sending' || authSubmit === 'sending') || undefined}
          data-disabled={
            (isPrivate && (!privateAddressValid || privateSubmit === 'sending')) ||
            (isLoggedIn && (isFiatMode || isConvert) && authSubmit === 'sending') ||
            undefined
          }
          aria-disabled={
            (isPrivate && (!privateAddressValid || privateSubmit === 'sending')) ||
            (isLoggedIn && (isFiatMode || isConvert) && authSubmit === 'sending') ||
            undefined
          }
        >
          {ctaLabel}
        </a>
      )}
      {isPrivate && privateSubmit !== 'idle' && privateSubmit !== 'sending' && (
        <span className="swap-cta-error" role="alert">
          {privateSubmit}
        </span>
      )}
      {!isPrivate && authSubmit !== 'idle' && authSubmit !== 'sending' && (
        <span className="swap-cta-error" role="alert">
          {authSubmit}
        </span>
      )}

      {(isFiatMode || showPro) && (
      <div className="swap-aux">
      {isFiatMode && (() => {
        // The cached estimate may be from a different pair (e.g. the user
        // just toggled into the fiat tab from Swap, where the last fetch
        // was BTC→ETH). Treat those providers as stale — show skeleton
        // until the in-flight fiat fetch resolves. Without this, the strip
        // briefly renders Guardarian against crypto-only `providers` from
        // the previous query and can flash an empty state on the same
        // frame the tab switches.
        const fromLower = from.toLowerCase();
        const toLower = to.toLowerCase();
        const estimateMatchesPair =
          estimate?.fromCurrency === fromLower && estimate?.toCurrency === toLower;
        const fiatProviders = estimateMatchesPair ? estimate.providers : [];
        const fiatIsLoading = isLoading || !estimateMatchesPair;
        return (
          // Provider strip — replaces the Pro upsell when the user is on
          // the fiat tab. The user can pick a non-default provider via
          // the embedded selector; the actual fulfillment still happens
          // on the legacy `/exchange` page after the deep link.
          <FiatProviderStrip
            providers={fiatProviders}
            selectedType={providerType}
            toCurrency={fiatDir === 'buy' ? to : from}
            onSelect={setProviderType}
            isLoading={fiatIsLoading}
          />
        );
      })()}

      {showPro && (
        <a
          className="swap-pro"
          href={isLoggedIn ? `${SITE_URL}/pro/balance` : '/registration'}
          onClick={onProClick}
        >
          {showSkeletonPro ? (
            <span className="swap-skel swap-skel-pro" aria-hidden />
          ) : (
            <span className="swap-pro-text">
              Swap with <strong>Pro</strong> and save{' '}
              <b className="swap-pro-amount">{formatUsd(cashbackUsd!)}</b>
            </span>
          )}
        </a>
      )}

      </div>
      )}
    </div>
  );
}
