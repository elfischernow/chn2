'use client';

// Phone-mode calculator for the "One account · Every surface" Mobile tab.
// Lives inside `.apps-phone-screen` (an iPhone-frame screen rect on the
// homepage). The mockup is a fully bespoke mobile layout — different from
// the desktop hero `SwapWidget` (CN logo header, two-tab pill, Type row,
// large cards with green TO amount, info list, Continue CTA). Rather than
// shoehorn the desktop widget into a phone shape we render a dedicated
// surface that reuses the SAME calculator logic — `useExchangeEstimate`,
// `<CurrencyPicker>`, `buildExchangeUrl`, the canonical estimate ↦ TO
// mirror pattern from `SwapWidget.tsx:374-382`. Functionally identical
// to "Swap, fixed/floating, BTC→USDT default"; visually identical to the
// supplied mockup.

import { useEffect, useMemo, useState } from 'react';

import type { Currency } from '@/lib/api/currencies';
import {
  buildExchangeUrl,
  type EstimateResponse,
  type EstimateType,
  type RateFlow,
} from '@/lib/api/exchange';

import { CurrencyPicker } from './CurrencyPicker';
import { formatAmount } from './calculator/shared/format';
import { useExchangeEstimate } from './useExchangeEstimate';

// Defaults mirror the legacy fixed-rate landing — BTC → USDT-TRC20, 0.1034
// BTC. That's the same flow the mockup shows; keeping the seed identical
// means the catalog default and the screenshot line up.
const DEFAULTS = {
  from: 'BTC',
  to: 'USDT',
  fromNetwork: 'btc',
  toNetwork: 'trx',
  amount: '0.1034',
} as const;

type RateUI = 'floating' | 'fixed';
type Tab = 'exchange' | 'balance';

interface Props {
  currencies: readonly Currency[];
}

function Countdown({ validUntil }: { validUntil: string | null }) {
  // Simpler than the shared `RateLockTimer` — the mockup shows a plain
  // clock icon + MM:SS, no pill, no amber threshold. Re-renders twice a
  // second (matches `RateLockTimer`'s cadence so the displayed second is
  // always within half a step of wall-clock).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!validUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [validUntil]);
  if (!validUntil) return <span>—</span>;
  const target = Date.parse(validUntil);
  if (!Number.isFinite(target)) return <span>—</span>;
  const total = Math.max(0, Math.ceil((target - now) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (
    <span className="pc-info-time">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export function PhoneCalculator({ currencies }: Props) {
  const [from, setFrom] = useState<string>(DEFAULTS.from);
  const [to, setTo] = useState<string>(DEFAULTS.to);
  const [fromNetwork, setFromNetwork] = useState<string>(DEFAULTS.fromNetwork);
  const [toNetwork, setToNetwork] = useState<string>(DEFAULTS.toNetwork);
  const [fromAmount, setFromAmount] = useState<string>(DEFAULTS.amount);
  const [toAmount, setToAmount] = useState<string>('');
  const [direction, setDirection] = useState<EstimateType>('direct');
  // Mockup leads with Fixed selected — green-outline pill on the Type
  // row — so we seed `rate` accordingly. Same `RateFlow` mapping the
  // hero widget uses.
  const [rate, setRate] = useState<RateUI>('fixed');
  // Tabs are visual-only here — both Exchange and Balance Convert route
  // the same calculator state. "Balance Convert" is a logged-in surface
  // on the production app; on the marketing landing it's there to mirror
  // the mockup, not to fork behaviour.
  const [tab, setTab] = useState<Tab>('exchange');

  const flow: RateFlow = rate === 'fixed' ? 'fixed-rate' : 'standard';
  const driverAmount = direction === 'direct' ? fromAmount : toAmount;

  const { estimate, error: _error, isLoading: _isLoading } = useExchangeEstimate({
    from,
    to,
    fromNetwork,
    toNetwork,
    amount: driverAmount,
    flow,
    type: direction,
  });

  // Same mirror-on-new-estimate pattern as `SwapWidget.tsx:374-382` — set
  // state during render when the estimate identity flips, so the follower
  // field reflects the upstream without a useEffect double-render.
  const [estimateRef, setEstimateRef] = useState<EstimateResponse | null>(null);
  if (estimate && estimate !== estimateRef) {
    setEstimateRef(estimate);
    if (direction === 'direct' && estimate.toAmount != null) {
      setToAmount(formatAmount(estimate.toAmount));
    } else if (direction === 'reverse' && estimate.fromAmount != null) {
      setFromAmount(formatAmount(estimate.fromAmount));
    }
  }

  // Live rate per unit of FROM (same derivation the hero widget uses).
  const marketRate = useMemo(() => {
    if (!estimate?.toAmount || !estimate.fromAmount) return null;
    return estimate.toAmount / estimate.fromAmount;
  }, [estimate]);

  const cashbackUsd = estimate?.cashbackUsd ?? null;

  const flip = () => {
    setFrom(to);
    setTo(from);
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
    // After flip, treat the previous TO as the new FROM input — the user
    // sees their typed value preserved across the swap.
    setFromAmount(toAmount || '');
    setToAmount('');
    setDirection('direct');
  };

  // Same CTA endpoint the hero widget targets — the legacy `/exchange`
  // page on the prod host. Carries the full pair + amount + flow so the
  // landing page picks up where the calculator left off.
  const ctaHref = buildExchangeUrl({
    from,
    to,
    fromNetwork,
    toNetwork,
    amount: fromAmount,
    flow,
    type: direction,
  });

  return (
    <div className="pc">
      {/* Header — CN wordmark + profile icon, mirrors the mockup status
          bar / app header. */}
      <header className="pc-header">
        <span className="pc-logo">
          Change<span className="pc-logo-now">NOW</span>
        </span>
        <span className="pc-profile" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        </span>
      </header>

      {/* Two-tab pill — Exchange / Balance Convert. */}
      <div className="pc-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="pc-tab"
          aria-selected={tab === 'exchange'}
          onClick={() => setTab('exchange')}
        >
          Exchange
        </button>
        <button
          type="button"
          role="tab"
          className="pc-tab"
          aria-selected={tab === 'balance'}
          onClick={() => setTab('balance')}
        >
          Balance Convert
        </button>
      </div>

      {/* Type row — inline Market / Fixed selector, matches the mockup
          eyebrow. Wired to the same `rate` state the hero widget uses
          so `flow` flips between `standard` and `fixed-rate`. */}
      <div className="pc-type-row">
        <span className="pc-type-label">Type:</span>
        <button
          type="button"
          className="pc-type-pill"
          aria-pressed={rate === 'floating'}
          onClick={() => setRate('floating')}
        >
          Market
        </button>
        <button
          type="button"
          className="pc-type-pill"
          aria-pressed={rate === 'fixed'}
          onClick={() => setRate('fixed')}
        >
          Fixed
        </button>
      </div>

      {/* Two big cards with the flip overlay between, per mockup. */}
      <div className="pc-fields">
        <div className="pc-card">
          <div className="pc-card-label">You sell</div>
          <CurrencyPicker
            currencies={currencies}
            selectedTicker={from}
            selectedNetwork={fromNetwork}
            ariaLabel="Sell currency"
            onSelect={(c) => {
              setFrom(c.currentTicker.toUpperCase());
              setFromNetwork(c.network);
            }}
            amountSlot={
              <input
                className="pc-amount"
                inputMode="decimal"
                value={fromAmount}
                onChange={(e) => {
                  setDirection('direct');
                  setFromAmount(e.target.value);
                }}
              />
            }
          />
        </div>

        <button type="button" className="pc-flip" aria-label="Flip" onClick={flip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4v14" />
            <path d="m3 8 4-4 4 4" />
            <path d="M17 20V6" />
            <path d="m21 16-4 4-4-4" />
          </svg>
        </button>

        <div className="pc-card">
          <div className="pc-card-label">You buy</div>
          <CurrencyPicker
            currencies={currencies}
            selectedTicker={to}
            selectedNetwork={toNetwork}
            ariaLabel="Buy currency"
            onSelect={(c) => {
              setTo(c.currentTicker.toUpperCase());
              setToNetwork(c.network);
            }}
            amountSlot={
              <input
                className="pc-amount pc-amount-receive"
                inputMode="decimal"
                value={toAmount}
                onChange={(e) => {
                  setDirection('reverse');
                  setToAmount(e.target.value);
                }}
              />
            }
          />
        </div>
      </div>

      {/* Info list — rate, next-rate-update countdown (fixed only),
          cashback. Each row appears only when its data is available so
          the layout doesn't reserve space for nothing. */}
      <ul className="pc-info">
        {marketRate != null && (
          <li className="pc-info-row">
            <span className="pc-info-label">
              {rate === 'fixed' ? 'Fixed rate:' : 'Estimated rate:'}
            </span>
            <span className="pc-info-value">
              1 {from} = {formatAmount(marketRate)} {to}
            </span>
          </li>
        )}
        {rate === 'fixed' && estimate?.validUntil && (
          <li className="pc-info-row">
            <span className="pc-info-label">Next rate update</span>
            <span className="pc-info-value">
              <Countdown validUntil={estimate.validUntil} />
            </span>
          </li>
        )}
        {cashbackUsd != null && cashbackUsd > 0 && (
          <li className="pc-info-row">
            <span className="pc-info-label">Expected cashback</span>
            <span className="pc-info-value">
              ~ {formatAmount(cashbackUsd)} in NOW
            </span>
          </li>
        )}
      </ul>

      <div className="pc-advanced">
        <span>Advanced settings</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>

      <a className="pc-cta" href={ctaHref}>
        Continue
      </a>

      <p className="pc-disclaimer">
        By continuing, you aware that this exchange is made through a{' '}
        <a href={ctaHref}>third-party service</a>.
      </p>
    </div>
  );
}
