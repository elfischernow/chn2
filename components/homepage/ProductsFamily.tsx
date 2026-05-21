import type { CSSProperties } from 'react';

import { SITE_URL } from '@/lib/config';
import { FAMILY } from '@/lib/links';

type Weight = 'hero' | 'wide' | 'cell';

interface Item {
  name: string;
  sub: string;
  href: string;
  /** Brand glyph (rounded-square icon, paired with the product name on
   *  the card). Lives at `public/images/products/<slug>.svg`. */
  icon: string;
  tag?: string;
  weight: Weight;
  /** Hex brand colour for the card's background tint and the product
   *  name rendered next to the icon. */
  brand: string;
}

const ITEMS: readonly Item[] = [
  {
    name: 'NOWPayments',
    sub: 'Accept crypto for business',
    tag: 'B2B',
    icon: '/images/products/now-payments.svg',
    href: FAMILY.nowPayments,
    weight: 'hero',
    brand: '#6CB0FF',
  },
  {
    name: 'NOW Wallet',
    sub: 'Non-custodial mobile wallet',
    icon: '/images/products/now-wallet.svg',
    href: FAMILY.nowWallet,
    weight: 'hero',
    brand: '#00A05C',
  },
  {
    name: 'NOW Custody',
    sub: 'Enterprise-grade custody',
    tag: 'B2B',
    icon: '/images/products/now-custody.svg',
    href: FAMILY.nowCustody,
    weight: 'cell',
    brand: '#2262CE',
  },
  {
    name: 'NOW Tracker',
    sub: 'Portfolio across 50+ chains',
    icon: '/images/products/now-tracker.svg',
    href: FAMILY.nowTracker,
    weight: 'cell',
    brand: '#255DC8',
  },
  {
    name: 'NOW Token',
    sub: 'Native utility & rewards',
    icon: '/images/products/now-token.svg',
    href: FAMILY.nowToken,
    weight: 'cell',
    brand: '#8080BE',
  },
  {
    name: 'NOWNodes',
    sub: 'Node infrastructure',
    tag: 'Dev',
    icon: '/images/products/now-nodes.svg',
    href: FAMILY.nowNodes,
    weight: 'cell',
    brand: '#9660AB',
  },
  {
    name: 'NOW Pro',
    sub: 'Premium tier for power users',
    icon: '/images/products/now-pro.svg',
    href: FAMILY.nowPro,
    weight: 'wide',
    brand: '#5A57CA',
  },
  {
    name: 'NOW Blog',
    sub: 'Education, news, market notes',
    icon: '/images/products/now-blog.svg',
    href: FAMILY.nowBlog,
    weight: 'wide',
    brand: '#E9C66C',
  },
];

const isExternal = (href: string) => !href.startsWith(SITE_URL);

/**
 * Per-card lockup — icon glyph + product name painted in the brand
 * colour. Previously two paths existed (legacy SVG wordmark vs.
 * icon-plus-text), but the legacy wordmarks bake the secondary word
 * (e.g. "Payments", "wallet") in `#FEFEFE` for a dark-background era,
 * so it disappeared on our light-tinted paper cards. One uniform path
 * gives every card the same look and works in both themes.
 */
function CardLockup({ it }: { it: Item }) {
  return (
    <div className="family-lockup">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="family-icon"
        src={it.icon}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
      />
      <span className="family-name" style={{ color: it.brand }}>
        {it.name}
      </span>
    </div>
  );
}

export function ProductsFamily() {
  return (
    <section className="family-section">
      <div className="family-head">
        <h2>
          One ecosystem.<br />
          <span className="tr-h2-light">Eight products.</span>
        </h2>
        <p className="family-sub">
          Each ships on its own, with its own login. Connected by shared infrastructure,
          shared liquidity routing, and a common brand.
        </p>
      </div>
      <div className="family-bento">
        {ITEMS.map((it) => (
          <a
            className={`family-card family-card-${it.weight}`}
            href={it.href}
            key={it.name}
            style={{ '--brand': it.brand } as CSSProperties}
            {...(isExternal(it.href)
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            <div className="family-card-body">
              <CardLockup it={it} />
              <div className="family-card-sub">{it.sub}</div>
            </div>
            {it.tag && <span className="family-tag">{it.tag}</span>}
            <span className="family-card-arrow" aria-hidden>→</span>
          </a>
        ))}
      </div>
    </section>
  );
}
