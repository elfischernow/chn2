import { SUPPORT } from '@/lib/links';
import { createT } from '@/lib/i18n/createT';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.contact-support` — always-on bottom strip linking to
 * the help center. Legacy renders this even when blocks are empty
 * (Q4: 1-to-1 port preserves the SEO-tuned content tail).
 */
export function ContactSupport({ block, dict }: BlockProps) {
  const t = createT(dict);
  const title = (block.title as string) || 'Need help?';
  const description = (block.description as string) || '';
  return (
    <section className={styles.section}>
      <div className={styles.cta}>
        <div className={styles.ctaText}>
          <span className={styles.ctaTitle}>{title}</span>
          {description && <span className={styles.ctaSub}>{description}</span>}
        </div>
        <a className={styles.ctaButton} href={SUPPORT.helpCenter}>
          {t('MAIN.SUPPORT_BUTTON', 'Contact support')} →
        </a>
      </div>
    </section>
  );
}
