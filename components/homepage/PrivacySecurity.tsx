import type { ReactNode } from 'react';

import { LEARN, SUPPORT } from '@/lib/links';

interface Col {
  icon: ReactNode;
  h: string;
  sub: string;
  tag: string;
  cta: { label: string; href: string };
}

// Each card surfaces a feature that's actually shipping in the product
// surface (linkable today) — no certifications we can't link to, no
// "$X recovered" without an evidence page. Tag = the most concrete
// number / proof we can defend; CTA = the page that shows the work.
const COLS: Col[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
      </svg>
    ),
    h: 'Swap without an account',
    sub:
      "No email, no KYC, no wallet connect. Pick a pair, paste a recipient address, get a transaction ID. " +
      "Sign-up is only required for fiat on-ramps where regulation demands it.",
    tag: 'Used in 90%+ of swaps',
    cta: { label: 'Try a swap →', href: '#hero' },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    h: 'Non-custodial by default',
    sub:
      "We never hold your assets longer than the swap takes. Funds enter our liquidity venue, " +
      "leave to your wallet on the same transaction, and we keep nothing on file beyond the on-chain trail.",
    tag: 'Funds on our books: ~0',
    cta: { label: 'How a swap works →', href: LEARN.howItWorks },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
    h: 'Private send',
    sub:
      "A separate flow for one-asset transfers — fixed-rate quote, single recipient, no public " +
      "intermediary address. Operating since 2020 alongside the standard exchange.",
    tag: 'TRC-20, ERC-20, BTC, more',
    cta: { label: 'Open private transfer →', href: '/private-transfers' },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v8M8 12h8" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    h: 'Asset-recovery requests',
    sub:
      "If a transaction lands in the wrong place — wrong network, wrong memo, an exchange you " +
      "lost access to — our recovery desk works with the receiving service to get it back where possible.",
    tag: 'Handled by support',
    cta: { label: 'Open a recovery case →', href: SUPPORT.contact },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s7-4 7-10V5l-7-3-7 3v7c0 6 7 10 7 10z" />
        <path d="M12 8v4l3 1" />
      </svg>
    ),
    h: 'AML / KYC, when it applies',
    sub:
      "We run AML on counterparties for fiat flows and high-risk corridors, per the FATF travel rule. " +
      "Crypto-only swaps under our risk thresholds stay non-custodial and unverified.",
    tag: 'Policy is public',
    cta: { label: 'Read the policy →', href: LEARN.security },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
    ),
    h: 'Operating since 2017',
    sub:
      "Eight years live, no exit, no rehypothecation events. Status, incidents and uptime are tracked publicly. " +
      "We won't print 'no incidents' without a page you can audit.",
    tag: 'status.changenow.io',
    cta: { label: 'Live status page →', href: SUPPORT.status },
  },
];

export function PrivacySecurity() {
  return (
    <section className="ps-section">
      <div className="ps-head">
        <h2>
          Custody you control.<br />
          <span className="tr-h2-light">Receipts you can audit.</span>
        </h2>
        <p className="ps-lede">
          We&apos;d rather link the page than make the claim. Every card below ends
          on a real page or a real action — not a logo we can&apos;t prove.
        </p>
      </div>
      <div className="ps-grid">
        {COLS.map((c, i) => (
          <article className="ps-col" key={i}>
            <div className="ps-icon">{c.icon}</div>
            <h3 className="ps-h">{c.h}</h3>
            <p className="ps-sub">{c.sub}</p>
            <div className="ps-foot">
              <span className="ps-tag">{c.tag}</span>
              <a className="ps-cta" href={c.cta.href}>{c.cta.label}</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
