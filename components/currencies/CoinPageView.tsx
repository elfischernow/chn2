import type { CoinPage } from '@/lib/api/content/types';
import { type Locale, DEFAULT_LOCALE, SITE_URL } from '@/lib/config';
import type { TranslationDict } from '@/lib/i18n/createT';
import { createT } from '@/lib/i18n/createT';

import { BlockRenderer } from './blocks/BlockRenderer';
import { mergeBlocks } from './blocks/DefaultBlocks';
import { CoinHero } from './CoinHero';
import styles from './currencies.module.css';

interface Props {
  locale: Locale;
  page: CoinPage;
  dict: TranslationDict;
  /** Path-based pagination of the embedded currencies-table block. 1 by default. */
  tablePage?: number;
}

/**
 * Server-render shell for `/currencies/[coin]`. Sequence:
 *   1. Breadcrumbs.
 *   2. Hero with icon + name + ticker + page description.
 *   3. Block stack (admin-controlled + defaults, merged).
 *   4. Inline JSON-LD: Product + BreadcrumbList.
 *
 * No client-side fetches anywhere on this surface — Q4 contract.
 */
export function CoinPageView({ locale, page, dict, tablePage }: Props) {
  const t = createT(dict);
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const blocks = mergeBlocks(page.blocks);

  return (
    <main className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a href={localePrefix || '/'}>{t('BREADCRUMBS.HOME')}</a>
        <span aria-hidden> / </span>
        <a href={`${localePrefix}/currencies`}>{t('BREADCRUMBS.CURRENCIES')}</a>
        <span aria-hidden> / </span>
        <span aria-current="page">{page.name || page.ticker.toUpperCase()}</span>
      </nav>

      <CoinHero page={page} dict={dict} />

      <BlockRenderer
        blocks={blocks}
        page={page}
        dict={dict}
        hrefBase={localePrefix}
        pageType="coin"
        tablePage={tablePage}
      />

      <CoinJsonLd locale={locale} page={page} />
    </main>
  );
}

function CoinJsonLd({ locale, page }: { locale: Locale; page: CoinPage }) {
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const url = `${SITE_URL}${localePrefix}/currencies/${page.link}`;
  // Mirrors legacy `currency-ld-json-markup.pug`. Product + AggregateRating +
  // Offer is the rich-result shape that earns search snippets; without these
  // we lose the price/rating tile in SERP. Numbers are sitewide constants
  // (Trustpilot rolls up to one rating across the brand — Q-decision in
  // memory). When the Trustpilot per-coin endpoint lands, swap these for
  // per-page values.
  const ratingValue = '4.4';
  const reviewCount = '13912';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': url,
        url,
        name: `${page.name} (${page.ticker.toUpperCase()})`,
        description: page.metaDescription || page.description || undefined,
        category: 'Cryptocurrency',
        image: page.iconUrl || undefined,
        brand: { '@type': 'Brand', name: 'ChangeNOW' },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue,
          reviewCount,
          bestRating: '5',
          worstRating: '1',
        },
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'USD',
          price: '0',
          availability: 'https://schema.org/InStock',
          category: 'cryptocurrency exchange',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_URL}${localePrefix || '/'}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Currencies',
            item: `${SITE_URL}${localePrefix}/currencies`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: page.name || page.ticker.toUpperCase(),
            item: url,
          },
        ],
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
