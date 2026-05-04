import { SUPPORT } from '@/lib/links';
import { createT } from '@/lib/i18n/createT';
import type { TranslationDict } from '@/lib/i18n/createT';

import blockStyles from './blocks/blocks.module.css';

interface Props {
  dict: TranslationDict;
}

/**
 * Tail block for the /currencies listing — same shape as `SellSupport` on
 * coin/pair pages but with copy specific to "new to coin exchange" rather
 * than per-currency questions. Mirrors the legacy listing's single h2.
 */
export function ListingSupport({ dict }: Props) {
  const t = createT(dict);
  const title = t('CURRENCIES_PAGE.LISTING_SUPPORT_TITLE', 'New to coin exchange on ChangeNOW?');
  const description = t(
    'CURRENCIES_PAGE.LISTING_SUPPORT_DESC',
    'Our support team is online 24/7 — drop us a line and we will help you get started.',
  );
  return (
    <section className={blockStyles.section}>
      <h2 className={blockStyles.sectionTitle}>{title}</h2>
      <div className={blockStyles.cta}>
        <div className={blockStyles.ctaText}>
          <span className={blockStyles.ctaSub}>{description}</span>
        </div>
        <a className={blockStyles.ctaButton} href={SUPPORT.contact} rel="noopener">
          {t('MAIN.CONTACT_SUPPORT', 'Contact support')} →
        </a>
      </div>
    </section>
  );
}
