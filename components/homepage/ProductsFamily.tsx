import { SITE_URL } from '@/lib/config';
import { FAMILY } from '@/lib/links';

const ITEMS: ReadonlyArray<{ name: string; sub: string; href: string; tag?: string }> = [
  { name: 'NOWPayments', sub: 'Accept crypto for business', tag: 'B2B', href: FAMILY.nowPayments },
  { name: 'NOW Wallet', sub: 'Non-custodial mobile wallet', href: FAMILY.nowWallet },
  { name: 'NOW Tracker', sub: 'Portfolio across 50+ chains', href: FAMILY.nowTracker },
  { name: 'NOW Custody', sub: 'Enterprise-grade custody', tag: 'B2B', href: FAMILY.nowCustody },
  { name: 'NOWNodes', sub: 'Node infrastructure as a service', tag: 'Dev', href: FAMILY.nowNodes },
  { name: 'NOW Token', sub: 'Native utility & rewards', href: FAMILY.nowToken },
  { name: 'NOW Blog', sub: 'Education, news, market notes', href: FAMILY.nowBlog },
  { name: 'NOW Pro', sub: 'Premium tier for power users', href: FAMILY.nowPro },
];

const isExternal = (href: string) => !href.startsWith(SITE_URL);

export function ProductsFamily() {
  return (
    <section className="family-section">
      <div className="family-head">
        <h2>
          One ecosystem.<br />
          <span className="tr-h2-light">Eight products.</span>
        </h2>
        <p className="family-sub">All connected. Same account, same liquidity, same standards.</p>
      </div>
      <div className="family-grid">
        {ITEMS.map((it) => (
          <a
            className="family-card"
            href={it.href}
            key={it.name}
            {...(isExternal(it.href)
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            <div className="family-card-mark">N</div>
            <div className="family-card-text">
              <div className="family-card-name">
                {it.name}
                {it.tag && <span className="family-tag">{it.tag}</span>}
              </div>
              <div className="family-card-sub">{it.sub}</div>
            </div>
            <div className="family-card-arrow">→</div>
          </a>
        ))}
      </div>
    </section>
  );
}
