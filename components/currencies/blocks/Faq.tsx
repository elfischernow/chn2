import { createT } from '@/lib/i18n/createT';
import { SITE_URL } from '@/lib/config';

import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface FaqItem {
  question?: string;
  answer?: string;
  id?: number;
}

/**
 * `currency-flow.faq` — accordion (uses native <details>, so it works
 * without JS). Also emits FAQPage JSON-LD inline so search engines pick
 * up the rich snippet without crawling for it.
 */
export function Faq({ block, page, dict }: BlockProps) {
  const t = createT(dict);
  const items = (Array.isArray(block.items) ? (block.items as FaqItem[]) : []).filter(
    (it) => it.question && it.answer,
  );
  if (items.length === 0) return null;
  const title =
    (block.title as string) || t('CURRENCIES_PAGE.FAQ_TITLE', { name: page.name });

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
    url: `${SITE_URL}/currencies/${page.link}`,
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.faqList}>
        {items.map((it, i) => (
          <details key={it.id ?? i} className={styles.faqItem}>
            <summary className={styles.faqSummary}>{it.question}</summary>
            <RichText
              content={it.answer ?? ''}
              variant="inline"
              className={styles.faqAnswer}
            />
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </section>
  );
}
