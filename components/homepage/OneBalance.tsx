import type { ReactNode } from 'react';

import { type Currency, getCurrencies } from '@/lib/api/currencies';
import { ACCOUNT } from '@/lib/links';

interface Feature {
  icon: ReactNode;
  h: string;
  sub: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    ),
    h: 'Held by us, owned by you',
    sub:
      'Operating since 2017 with no exit, no rehypothecation. Withdraw on demand. Reserves, incidents and uptime are tracked on a public page you can audit.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7h14M3 7l4-4M3 7l4 4" />
        <path d="M21 17H7m14 0-4 4m4-4-4-4" />
      </svg>
    ),
    h: 'Trade from one balance',
    sub:
      'Spot, fixed-rate, recurring buys, staking, limit orders. Same pool of liquidity, same balance — no separate funding for each rail.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </svg>
    ),
    h: 'Send & receive in seconds',
    sub:
      'Any chain, any asset, any address. We route the cheapest path and pre-flight every transfer for wrong networks, missing memos, dust thresholds.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l8 4.5" />
        <path d="M12 12 4.5 7.5" />
      </svg>
    ),
    h: 'Build a portfolio by category',
    sub:
      'Pick from baskets — L1s, AI, stables, RWA, blue-chips — or compose your own. Allocate by weight, top up with a single click.',
  },
];

interface Slice {
  label: string;
  pct: number;
  color: string;
}

const ALLOCATION: Slice[] = [
  { label: 'L1s',     pct: 38, color: '#00C26F' },
  { label: 'Stables', pct: 24, color: '#4E95FF' },
  { label: 'AI',      pct: 18, color: '#B884F5' },
  { label: 'DeFi',    pct: 12, color: '#F39321' },
  { label: 'RWA',     pct:  8, color: '#FF6B8A' },
];

interface Holding {
  ticker: string;
  name: string;
  value: string;
  change: string;
  up?: boolean;
  flat?: boolean;
  color: string;
}

const HOLDINGS: Holding[] = [
  { ticker: 'BTC',  name: 'Bitcoin',  value: '$18,420.14', change: '+2.1%', up: true,  color: '#F7931A' },
  { ticker: 'ETH',  name: 'Ethereum', value: '$11,840.20', change: '+3.4%', up: true,  color: '#627EEA' },
  { ticker: 'SOL',  name: 'Solana',   value: '$4,210.55',  change: '+5.8%', up: true,  color: '#14F195' },
  { ticker: 'USDC', name: 'USD Coin', value: '$4,000.00',  change: '0.0%',  flat: true, color: '#2775CA' },
];

function AssetMark({
  ticker,
  color,
  iconUrl,
}: {
  ticker: string;
  color: string;
  iconUrl: string | null;
}) {
  if (iconUrl) {
    // Same source the calculator uses (Strapi-served per-currency SVG).
    // No background tint — the icon carries its own brand colour.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="ob-mark ob-mark-img"
        src={iconUrl}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
      />
    );
  }
  // Letter-tile fallback when the upstream omitted an icon for this
  // currency — keeps the row visually distinct.
  return (
    <span className="ob-mark" style={{ background: color }} aria-hidden>
      {ticker.charAt(0)}
    </span>
  );
}

/** Resolve the icon url for a holding by matching against the currency
 *  catalog. We pick the lowest-position row for each ticker (canonical
 *  chain) so multi-network tickers like USDC default to their primary
 *  variant — same heuristic the calculator's currency picker uses. */
function pickIcon(ticker: string, currencies: readonly Currency[]): string | null {
  const upper = ticker.toUpperCase();
  const matches = currencies
    .filter((c) => c.currentTicker.toUpperCase() === upper)
    .sort((a, b) => a.position - b.position);
  return matches[0]?.iconUrl ?? null;
}

export async function OneBalance() {
  // Pulled from the same source the calculator uses, so the inert
  // portfolio card on this section reuses the real per-currency icons
  // (BTC, ETH, SOL, USDC) instead of the colored-letter placeholders
  // the original draft shipped with.
  const currencies = await getCurrencies();
  const holdings = HOLDINGS.map((h) => ({
    ...h,
    iconUrl: pickIcon(h.ticker, currencies),
  }));

  return (
    <section className="ob-section">
      <div className="ob-head">
        <span className="ob-eyebrow">
          <span className="ob-eyebrow-dot" /> Hold · Trade · Move · Grow
        </span>
        <h2>
          A home for everything<br />
          <span className="tr-h2-light">you own.</span>
        </h2>
        <p className="ob-lede">
          One balance. Every move. Hold it, trade it, send it, build with it — without
          leaving the app or funding a second account.
        </p>
      </div>

      <div className="ob-grid">
        {/* Inert portfolio card — looks live, doesn't fetch. The value-prop moves,
            not the numbers. */}
        <div className="ob-visual" aria-hidden>
          <div className="ob-card">
            <div className="ob-card-top">
              <span className="ob-card-label">Portfolio</span>
              <span className="ob-card-live">
                <span className="ob-card-live-dot" /> Live
              </span>
            </div>

            <div className="ob-card-balance">$42,318.40</div>
            <div className="ob-card-delta">
              <span className="ob-card-delta-arrow">▲</span>
              <span className="ob-card-delta-abs">+$1,712.84</span>
              <span className="ob-card-delta-rel">+4.2% · 24h</span>
            </div>

            <div className="ob-alloc">
              <div className="ob-alloc-bar">
                {ALLOCATION.map((s) => (
                  <span
                    key={s.label}
                    className="ob-alloc-seg"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                ))}
              </div>
              <div className="ob-alloc-legend">
                {ALLOCATION.map((s) => (
                  <span className="ob-alloc-leg" key={s.label}>
                    <span className="ob-alloc-dot" style={{ background: s.color }} />
                    {s.label}
                    <span className="ob-alloc-pct">{s.pct}%</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="ob-card-divider" />

            <ul className="ob-holdings">
              {holdings.map((h) => (
                <li className="ob-hold" key={h.ticker}>
                  <AssetMark ticker={h.ticker} color={h.color} iconUrl={h.iconUrl} />
                  <span className="ob-hold-name">
                    <span className="ob-hold-tk">{h.ticker}</span>
                    <span className="ob-hold-sub">{h.name}</span>
                  </span>
                  <span className="ob-hold-val">{h.value}</span>
                  <span
                    className={
                      'ob-hold-chg ' +
                      (h.flat ? 'flat' : h.up ? 'up' : 'dn')
                    }
                  >
                    {h.change}
                  </span>
                </li>
              ))}
            </ul>

            <div className="ob-card-foot">
              <span className="ob-card-foot-pill">
                <span className="ob-card-foot-dot" /> Withdraw any time
              </span>
              <span className="ob-card-foot-meta">No lock-up</span>
            </div>
          </div>
        </div>

        <div className="ob-features">
          {FEATURES.map((f) => (
            <article className="ob-feat" key={f.h}>
              <div className="ob-feat-icon">{f.icon}</div>
              <div className="ob-feat-body">
                <h3 className="ob-feat-h">{f.h}</h3>
                <p className="ob-feat-sub">{f.sub}</p>
              </div>
            </article>
          ))}

          <div className="ob-cta-row">
            <a className="btn-hero" href={ACCOUNT.signup}>
              <span className="btn-hero-bg">
                <span className="btn-hero-text">Open account</span>
                <span className="btn-hero-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
