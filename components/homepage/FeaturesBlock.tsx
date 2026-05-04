'use client';

import { useState } from 'react';

type Tone = 'plum' | 'amber' | 'graphite' | 'teal';
type OverlayKind = 'pill' | 'chip' | 'ticker' | 'gauge';
type OverlayPos = 'tl' | 'tr' | 'bl' | 'br' | 'center';

interface Overlay {
  kind: OverlayKind;
  text?: string;
  dot?: boolean;
  pos?: OverlayPos;
}

interface Card {
  id: string;
  title: string;
  sub: string;
  tone: Tone;
  overlay?: Overlay;
  overlay2?: Overlay;
}

const FB_CARDS: Record<string, Card[]> = {
  Featured: [
    { id: 'predictions', title: 'Prediction markets', sub: 'Trade ideas — politics, crypto milestones, sports.', tone: 'plum', overlay: { kind: 'pill', text: 'Will BTC close > $100k?', pos: 'tl' }, overlay2: { kind: 'chip', text: 'YES · 64¢', pos: 'br' } },
    { id: 'rwa', title: 'Tokenized stocks & RWA', sub: 'Hold AAPL, NVDA, gold — settle in stables.', tone: 'amber', overlay: { kind: 'ticker', pos: 'center' } },
    { id: 'paid', title: 'Get paid in crypto', sub: 'Share a link, receive any asset.', tone: 'graphite', overlay: { kind: 'pill', text: 'Payment received', dot: true, pos: 'bl' }, overlay2: { kind: 'chip', text: '+320 USDT', pos: 'tr' } },
    { id: 'wallet', title: 'NOW Wallet', sub: 'Non-custodial Web3 wallet — keys in your hand.', tone: 'teal', overlay: { kind: 'pill', text: '0x4f...A2B', dot: true, pos: 'tl' }, overlay2: { kind: 'chip', text: '12 chains', pos: 'br' } },
  ],
  Trade: [
    { id: 'spot', title: 'Spot & limit', sub: 'Pro charts, deep books.', tone: 'graphite', overlay: { kind: 'pill', text: 'BTC · $67,432', pos: 'bl' } },
    { id: 'swap', title: 'Cross-chain swap', sub: '70+ networks in one trade.', tone: 'teal', overlay: { kind: 'pill', text: 'BTC → ETH · 4 min', pos: 'bl' } },
    { id: 'perps', title: 'Perpetuals', sub: 'Up to 100× leverage.', tone: 'plum', overlay: { kind: 'chip', text: 'Soon', pos: 'tr' } },
    { id: 'pred', title: 'Prediction markets', sub: 'Bet on outcomes.', tone: 'amber', overlay: { kind: 'pill', text: 'YES · 64¢', pos: 'tl' } },
  ],
  Earn: [
    { id: 'stake', title: 'Staking', sub: 'Up to 12% APR, unstake anytime.', tone: 'teal', overlay: { kind: 'pill', text: '12.4% APR', pos: 'tl' } },
    { id: 'rwa2', title: 'Tokenized stocks', sub: 'AAPL, NVDA, gold.', tone: 'amber', overlay: { kind: 'ticker', pos: 'center' } },
    { id: 'now', title: 'NOW token', sub: 'Lower fees, partner perks.', tone: 'plum', overlay: { kind: 'chip', text: 'NOW · +4.2%', pos: 'br' } },
    { id: 'loans2', title: 'Crypto-backed loans', sub: 'Borrow stables, keep upside.', tone: 'graphite', overlay: { kind: 'gauge', pos: 'center' } },
  ],
  Spend: [
    { id: 'card', title: 'NOW Card', sub: 'Spend any crypto, anywhere Visa works.', tone: 'graphite', overlay: { kind: 'chip', text: 'Soon', pos: 'tr' } },
    { id: 'pay', title: 'Pay invoices', sub: 'Bills, rent, subscriptions.', tone: 'teal', overlay: { kind: 'pill', text: 'Paid · €1,240', pos: 'bl' } },
    { id: 'gift', title: 'Gift cards', sub: '500+ brands worldwide.', tone: 'amber', overlay: { kind: 'pill', text: '$50 sent', pos: 'tl' } },
    { id: 'travel', title: 'Travel', sub: 'Book flights & hotels.', tone: 'plum', overlay: { kind: 'pill', text: 'LIS → BCN', pos: 'tl' } },
  ],
  Send: [
    { id: 'paid2', title: 'Get paid', sub: 'Share a link, receive anything.', tone: 'graphite', overlay: { kind: 'pill', text: 'Payment received', dot: true, pos: 'bl' } },
    { id: 'private', title: 'Private send', sub: 'No metadata, no trace.', tone: 'plum', overlay: { kind: 'gauge', pos: 'center' } },
    { id: 'p2p', title: 'P2P transfer', sub: 'Phone, email, handle.', tone: 'teal', overlay: { kind: 'pill', text: 'Sending to you', pos: 'tr' } },
    { id: 'mass', title: 'Mass payouts', sub: 'Batch payments via API.', tone: 'amber', overlay: { kind: 'chip', text: '124 paid', pos: 'br' } },
  ],
};

const TABS = ['Featured', 'Trade', 'Earn', 'Spend', 'Send'];

function FeatureCardOverlay({ overlay }: { overlay?: Overlay }) {
  if (!overlay) return null;
  const posClass = `fb-pos-${overlay.pos ?? 'bl'}`;
  if (overlay.kind === 'pill') {
    return (
      <div className={`fb-pill ${posClass}`}>
        {overlay.dot && <span className="fb-pill-dot" />}
        <span>{overlay.text}</span>
      </div>
    );
  }
  if (overlay.kind === 'chip') {
    return <div className={`fb-chip ${posClass}`}>{overlay.text}</div>;
  }
  if (overlay.kind === 'ticker') {
    return (
      <div className={`fb-ticker ${posClass}`}>
        <div className="fb-tk-row"><span>AAPL</span><span className="up">+1.24%</span></div>
        <div className="fb-tk-row"><span>NVDA</span><span className="up">+2.71%</span></div>
        <div className="fb-tk-row"><span>GOLD</span><span className="dn">−0.32%</span></div>
      </div>
    );
  }
  if (overlay.kind === 'gauge') {
    return (
      <div className={`fb-gauge ${posClass}`}>
        <div className="fb-gauge-ring"><span>70%</span></div>
        <div className="fb-gauge-cap">LTV · safe</div>
      </div>
    );
  }
  return null;
}

export function FeaturesBlock() {
  const [tab, setTab] = useState('Featured');
  const cards = FB_CARDS[tab] ?? FB_CARDS.Featured!;
  return (
    <section className="fb-section">
      <div className="fb-head">
        <h2>One app. All your crypto. Every verb.</h2>
        <p className="fb-sub">
          Money is a verb here. Trade, hold, stake, borrow, invest, spend — without ever leaving
          the app.
        </p>
      </div>
      <div className="fb-tabs" role="tablist">
        <div className="fb-tab-group">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`fb-tab ${tab === t ? 'on' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="fb-grid">
        {cards.map((c) => (
          <article key={c.id} className={`fb-card tone-${c.tone}`}>
            <div className="fb-vis">
              <div className="fb-vis-bg" />
              <FeatureCardOverlay overlay={c.overlay} />
              <FeatureCardOverlay overlay={c.overlay2} />
            </div>
            <div className="fb-caption">
              <h3 className="fb-caption-title">{c.title}</h3>
              <p className="fb-caption-sub">{c.sub}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
