import { BUSINESS, LEARN, PRODUCTS, SUPPORT } from '@/lib/links';
import { createT } from '@/lib/i18n/createT';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.useful-links` — link cluster on the SEO tail. Internal
 * links flow into deep marketing pages and the help center. Static set —
 * the legacy block was static too, surfacing the same fixture across all
 * coin/pair surfaces. If admin ever wires per-coin overrides, fall back to
 * `block.links` first.
 */
export function UsefulLinks({ block, page, dict }: BlockProps) {
  const t = createT(dict);
  const title = (block.title as string) || t('CURRENCIES_PAGE.USEFUL_LINKS_TITLE', 'Useful links');

  const adminLinks: { label: string; href: string }[] = Array.isArray(block.links)
    ? (block.links as { label?: string; href?: string }[])
        .filter((l) => l.label && l.href)
        .map((l) => ({ label: l.label!, href: l.href! }))
    : [];
  // Strapi sends an empty `links: []` for pair pages where no per-page
  // overrides exist. Treat empty same as "absent" so the default fixture
  // still renders — without this the section had a heading and no body.
  const items =
    adminLinks.length > 0
      ? adminLinks
      : [
          { label: 'How it works', href: LEARN.howItWorks },
          { label: 'FAQ', href: LEARN.faq },
          { label: 'Help center', href: SUPPORT.helpCenter },
          { label: 'Buy crypto', href: PRODUCTS.buyCrypto },
          { label: 'Asset recovery', href: LEARN.assetRecovery },
          { label: 'Affiliate program', href: BUSINESS.affiliate },
        ];
  void page;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.bullets}>
        {items.map((it) => (
          <li key={it.href} className={styles.bullet}>
            <a className={styles.bulletTitle} href={it.href}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
