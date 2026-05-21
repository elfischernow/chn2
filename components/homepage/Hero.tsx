import { Suspense } from 'react';

import { getCurrencies } from '@/lib/api/currencies';
import { ACCOUNT } from '@/lib/links';

import { SwapWidget } from './SwapWidget';
import { TrustpilotLazy } from './TrustpilotLazy';

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
      {/* Left column wrapper. On desktop the wrapper is a flex column so
          headtop (eyebrow + h1) and headbottom (dek + CTA + Trustpilot)
          flow naturally with one predictable gap — no sandwich around
          the calculator. On mobile the wrapper uses `display: contents`,
          dropping itself from layout so the grid's three-row
          `"headtop" "widget" "headbot"` order still works. */}
      <div className="hero-leftcol">
        {/* Eyebrow is a sibling of `.hero-headtop`, not a child, so we can
            place it in its own grid area on mobile (under the calculator).
            On desktop, `.hero-leftcol` is `display: flex` and it flows
            naturally above the h1 — same visual order as before. */}
        <div className="hero-eyebrow">
          <span className="eyebrow">
            <span className="dot" /> Trusted globally · since 2017
          </span>
        </div>
        <div className="hero-headtop">
          <h1>
            Change the way<br />
            you <span className="ital" style={{ color: 'rgb(0, 194, 111)' }}>money</span>
            <span className="accent">.</span>
          </h1>
        </div>

        <div className="hero-headbottom">
          <p className="hero-dek">
            <span className="hero-dek-lead">Buy, store, exchange and use crypto</span> — in one
            app. From a quick swap to staking, loans, perps and tokenized stocks. No app-hopping,
            no paperwork.
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

          {/* Desktop: Micro Trust Score — single horizontal line
              "TrustScore X.X ★★★★★ Trustpilot". Mobile: switches to the
              footer's Mini TrustBox so the actual rating + review count
              appear stacked at a phone-readable size. CSS toggles which
              one is mounted. */}
          <div className="hero-trust hero-trust--desktop">
            <TrustpilotLazy
              template="5419b637fa0340045cd0c936"
              height={24}
              width="240px"
              alignment="left"
            />
          </div>
          <div className="hero-trust hero-trust--mobile">
            <TrustpilotLazy
              template="53aa8807dec7e10d38f59f32"
              theme="dark"
              height={150}
              width="120px"
            />
          </div>
        </div>
      </div>

      <Suspense fallback={<SwapWidgetSkeleton />}>
        <SwapWidgetSlot />
      </Suspense>
    </section>
  );
}
