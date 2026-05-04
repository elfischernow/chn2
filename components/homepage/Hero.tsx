import { Suspense } from 'react';

import { getCurrencies } from '@/lib/api/currencies';
import { ACCOUNT, REVIEWS } from '@/lib/links';

import { SwapWidget } from './SwapWidget';

// Async slot for the swap widget — pulled out so the hero shell (heading,
// CTA, trust strip) can render without waiting on the ~150KB currencies
// catalog. The Suspense fallback keeps the widget's footprint reserved so
// the page doesn't reflow when it lands.
async function SwapWidgetSlot() {
  const currencies = await getCurrencies();
  return <SwapWidget currencies={currencies} />;
}

function SwapWidgetSkeleton() {
  return <div className="swap-widget-skeleton" aria-hidden style={{ minHeight: 420 }} />;
}

export function Hero() {
  return (
    <section className="hero">
      <div>
        <span className="eyebrow">
          <span className="dot" /> Trusted globally · since 2017
        </span>
        <h1>
          Change the way<br />
          you <span className="ital" style={{ color: 'rgb(0, 194, 111)' }}>money</span>
          <span className="accent">.</span>
        </h1>
        <p className="hero-dek">
          Buy, store, exchange and use crypto — in one app. From a quick swap to staking, loans,
          perps and tokenized stocks. No app-hopping, no paperwork.
        </p>
        <div className="hero-cta">
          <a className="btn-hero" href={ACCOUNT.signup}>
            <span className="btn-hero-bg">
              <span className="btn-hero-text">Open account</span>
              <span className="btn-hero-arrow">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </span>
          </a>
        </div>

        <div className="hero-trust">
          <a className="trust-logo" href={REVIEWS.trustpilot} target="_blank" rel="noopener">Trustpilot</a>
          <div className="trust-stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i}>
                <svg viewBox="0 0 12 12" fill="#fff">
                  <path d="M6 0l1.5 4H12l-3.5 2.5L10 11 6 8.5 2 11l1.5-4.5L0 4h4.5z" />
                </svg>
              </span>
            ))}
          </div>
          <div className="trust-text">
            <strong>4.7 out of 5</strong> · based on 28,419 reviews
          </div>
        </div>
      </div>

      <Suspense fallback={<SwapWidgetSkeleton />}>
        <SwapWidgetSlot />
      </Suspense>
    </section>
  );
}
