import { SUPPORT } from '@/lib/links';
import { createT } from '@/lib/i18n/createT';

import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.sell-support` — distinct from `contact-support` (bottom-of-
 * page generic strip). This is a content-tail block with copy specific to
 * the page's currency or pair: "Questions about <X> exchange?". Rendered as
 * an always-on default near the FAQ tail.
 */
export function SellSupport({ block, page, counter, dict }: BlockProps) {
  const t = createT(dict);
  const subject = counter
    ? `${page.ticker.toUpperCase()} to ${counter.ticker.toUpperCase()}`
    : page.name || page.ticker.toUpperCase();
  const title =
    (block.title as string) ||
    t('CURRENCIES_PAGE.SELL_SUPPORT_TITLE', `Questions about ${subject} exchange?`, {
      subject,
    });
  const description =
    (block.description as string) ||
    t(
      'CURRENCIES_PAGE.SELL_SUPPORT_DESC',
      `Our support team is online 24/7 to help with anything ${subject}-related.`,
      { subject },
    );

  return (
    <section className={styles.section}>
      {/* The h2 lives outside the CTA card so it's still picked up as a
          section landmark by crawlers (legacy used `role="heading"` on a
          span; we just emit a real heading). */}
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sellSupport}>
        <div>
          <RichText content={description} variant="inline" className={styles.ctaSub} />
          <div style={{ marginTop: 24 }}>
            <a className={styles.ctaButton} href={SUPPORT.contact} rel="noopener">
              {t('MAIN.CONTACT_SUPPORT', 'Contact support')}
            </a>
          </div>
        </div>
        {/* Phone-mockup illustration carried over verbatim from the legacy
            sell-crypto-page block. The image is purely decorative — kept
            empty alt + lazy-loaded so it doesn't block LCP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.sellSupportImg}
          src="/images/currencies/legacy/sell-support-iphone.webp"
          alt=""
          width={240}
          height={420}
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
