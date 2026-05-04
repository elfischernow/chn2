import type { ReactNode } from 'react';

interface Col {
  icon: ReactNode;
  h: string;
  sub: string;
  tag: string;
}

const COLS: Col[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />
      </svg>
    ),
    h: 'Privacy-first by design',
    sub: 'Basic swaps without registration. Private send hides recipient metadata. KYC only when law requires it — never for product up-sell.',
    tag: 'No-account swap',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
    h: 'Audited security',
    sub: 'Non-custodial architecture. SOC-2 Type II and ISO 27001 certified. Quarterly third-party audits. Nine years operating, zero major incidents.',
    tag: 'SOC-2 · ISO 27001',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-5-5" />
      </svg>
    ),
    h: 'Asset recovery cases',
    sub: 'We help victims of scams trace and recover lost crypto. Active cooperation with law enforcement and exchanges on stolen-fund tracing.',
    tag: '$14M+ recovered',
  },
];

export function PrivacySecurity() {
  return (
    <section className="ps-section">
      <div className="ps-head">
        <h2>
          Custody you control.<br />
          <span className="tr-h2-light">Security you can audit.</span>
        </h2>
      </div>
      <div className="ps-grid">
        {COLS.map((c, i) => (
          <article className="ps-col" key={i}>
            <div className="ps-icon">{c.icon}</div>
            <h3 className="ps-h">{c.h}</h3>
            <p className="ps-sub">{c.sub}</p>
            <div className="ps-tag">{c.tag}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
