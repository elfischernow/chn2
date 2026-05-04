'use client';

import { useState } from 'react';

import { SUPPORT } from '@/lib/links';

const ITEMS = [
  {
    q: 'Is ChangeNOW safe to use?',
    a: "Non-custodial architecture means you control your keys. We're SOC-2 Type II and ISO 27001 certified, audited quarterly, and have operated for 9 years with zero major incidents.",
  },
  {
    q: 'Do I need to register or pass KYC?',
    a: 'Basic swaps work without an account or KYC. KYC is only required for fiat ramps and certain regulated jurisdictions — never for crypto-to-crypto under standard limits.',
  },
  {
    q: 'How long does a swap take?',
    a: 'Most swaps complete in 5–20 minutes depending on the network. ETH and stablecoin pairs settle fastest; BTC takes a few confirmations.',
  },
  {
    q: 'What countries are supported?',
    a: 'ChangeNOW operates in 200+ countries. A small list is restricted due to local regulation — see our compliance page for the current list.',
  },
  {
    q: 'What are the fees?',
    a: 'Network fees are passed through. Swap markup is built into the rate you see — no hidden fees, no surprise deductions. Pro and VIP tiers get progressively better rates.',
  },
  {
    q: 'Can I undo a transaction?',
    a: "Crypto transactions are final once confirmed on-chain. If you sent to a wrong address or were scammed, our recovery team will help where it's technically possible.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq-section">
      <div className="faq-head">
        <h2>
          Things people <span className="tr-h2-light">ask.</span>
        </h2>
      </div>
      <div className="faq-list">
        {ITEMS.map((it, i) => (
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={i}>
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{it.q}</span>
              <span className="faq-toggle">{open === i ? '–' : '+'}</span>
            </button>
            {open === i && <div className="faq-a">{it.a}</div>}
          </div>
        ))}
      </div>
      <div className="faq-foot">
        <span>Still have questions?</span>
        <a className="btn btn-outline" href={SUPPORT.contact} target="_blank" rel="noopener noreferrer">
          Contact support →
        </a>
      </div>
    </section>
  );
}
