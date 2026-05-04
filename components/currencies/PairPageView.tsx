import type { PairPage } from '@/lib/api/content/types';
import { type Locale, DEFAULT_LOCALE, SITE_URL } from '@/lib/config';
import type { TranslationDict } from '@/lib/i18n/createT';
import { createT } from '@/lib/i18n/createT';

import { BlockRenderer } from './blocks/BlockRenderer';
import { mergeBlocks } from './blocks/DefaultBlocks';
import { CoinHero } from './CoinHero';
import styles from './currencies.module.css';

interface Props {
  locale: Locale;
  page: PairPage;
  dict: TranslationDict;
  tablePage?: number;
}

/**
 * Pair-page server-render shell. Same scaffold as `CoinPageView`, but the
 * hero shows BOTH currency icons + a "FROM → TO" title, and the JSON-LD
 * block reflects the pair. BlockRenderer runs in `pair` mode so pair-only
 * blocks (exchange-rate, other-options) resolve, with coin blocks falling
 * through automatically.
 */
export function PairPageView({ locale, page, dict, tablePage }: Props) {
  const t = createT(dict);
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const blocks = mergeBlocks(page.blocks, 'pair');

  const fromTicker = page.ticker.toUpperCase();
  const toTicker = page.counter.ticker.toUpperCase();

  return (
    <main className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a href={localePrefix || '/'}>{t('BREADCRUMBS.HOME')}</a>
        <span aria-hidden> / </span>
        <a href={`${localePrefix}/currencies`}>{t('BREADCRUMBS.CURRENCIES')}</a>
        <span aria-hidden> / </span>
        <a href={`${localePrefix}/currencies/${page.link}`}>{page.name}</a>
        <span aria-hidden> / </span>
        <span aria-current="page">{page.counter.name}</span>
      </nav>

      <CoinHero
        page={page}
        dict={dict}
        titleOverride={
          // Prefer Strapi `title` so the h1 stays editor-driven ("ETH to SOL
          // Bridge", "LTC to DOGE Crypto Exchange", etc.). Hardcoded
          // template was overriding the admin's intent and producing
          // generic "<X> to <Y> Convert" everywhere.
          (page.title && page.title.trim()) ||
          `${fromTicker} to ${toTicker} Crypto Exchange`
        }
        counterTicker={page.counter.ticker}
        counterNetwork={page.counter.network}
        counterIconUrl={page.counter.iconUrl}
      />

      <BlockRenderer
        blocks={blocks}
        page={page}
        dict={dict}
        hrefBase={localePrefix}
        pageType="pair"
        tablePage={tablePage}
        counter={page.counter}
      />

      <PairJsonLd locale={locale} page={page} />
    </main>
  );
}

function PairJsonLd({ locale, page }: { locale: Locale; page: PairPage }) {
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const url = `${SITE_URL}${localePrefix}/currencies/${page.link}/${page.counter.link}`;
  const fromTicker = page.ticker.toUpperCase();
  const toTicker = page.counter.ticker.toUpperCase();
  // Same rationale as `CoinJsonLd` — sitewide Trustpilot rating until per-pair
  // hookup lands. AggregateRating + Offer earn the rich SERP tile.
  const ratingValue = '4.4';
  const reviewCount = '13912';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': url,
        url,
        name: `${page.name} (${fromTicker}) to ${page.counter.name} (${toTicker})`,
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
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}${localePrefix || '/'}` },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Currencies',
            item: `${SITE_URL}${localePrefix}/currencies`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: page.name,
            item: `${SITE_URL}${localePrefix}/currencies/${page.link}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: page.counter.name,
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
