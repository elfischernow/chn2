import { getCurrencies } from '@/lib/api/currencies';
import { type Locale, DEFAULT_LOCALE, SITE_URL } from '@/lib/config';
import { applyListing, type ListingSort, NOINDEX_PAGE_FROM } from '@/lib/currencies/listing';
import { loadDict, pickI18n } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

import { CurrenciesSearch } from './CurrenciesSearch';
import { CurrenciesSortToggle } from './CurrenciesSortToggle';
import { CurrenciesTable } from './CurrenciesTable';
import { ListingSupport } from './ListingSupport';
import { Pagination } from './Pagination';

import styles from './currencies.module.css';

interface Props {
  locale: Locale;
  page: number;
  q: string;
  sort: ListingSort;
}

/**
 * Shared server-render for both `/currencies` and `/currencies/page/[N]`.
 * Both routes converge here; the only difference is how `page` is sourced.
 *
 * SSR contract: every visible string and URL is in the HTML at first byte.
 * No fetches inside client components, no `useEffect` data-loaders.
 */
export async function CurrenciesPage({ locale, page, q, sort }: Props) {
  const [currencies, fullDict] = await Promise.all([
    getCurrencies(),
    loadDict(locale),
  ]);
  const dict = pickI18n(fullDict, ['CURRENCIES_TABLE', 'CURRENCIES_PAGE', 'CURRENCIES_PAGINATION', 'BREADCRUMBS', 'META']);
  const t = createT(dict);

  const result = applyListing(currencies, { q, sort, page, perPage: 50 });
  const startIndex = (result.page - 1) * result.perPage + 1;

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const basePath = `${localePrefix}/currencies`;
  const preserve: Record<string, string> = {};
  if (q) preserve.q = q;
  if (sort === 'abc') preserve.sort = 'abc';

  const totalCount = currencies.length;

  return (
    <main className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a href={localePrefix || '/'}>{t('BREADCRUMBS.HOME')}</a>
        <span aria-hidden> / </span>
        {result.page > 1 ? (
          <>
            <a href={basePath}>{t('BREADCRUMBS.CURRENCIES')}</a>
            <span aria-hidden> / </span>
            <span aria-current="page">{t('BREADCRUMBS.PAGE', { page: result.page })}</span>
          </>
        ) : (
          <span aria-current="page">{t('BREADCRUMBS.CURRENCIES')}</span>
        )}
      </nav>

      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{t('CURRENCIES_PAGE.HEADING')}</h1>
        <p className={styles.heroSub}>
          {t('CURRENCIES_PAGE.SUBTITLE', { count: totalCount })}
        </p>
      </header>

      <div className={styles.controls}>
        <CurrenciesSearch
          action={basePath}
          initialValue={q}
          dict={dict}
          preserve={sort === 'abc' ? { sort: 'abc' } : undefined}
        />
        <CurrenciesSortToggle
          current={sort}
          basePath={basePath}
          preserve={preserve}
          dict={dict}
        />
      </div>

      <CurrenciesTable
        rows={result.rows}
        startIndex={startIndex}
        dict={dict}
        hrefBase={localePrefix}
      />

      <Pagination
        current={result.page}
        total={result.totalPages}
        basePath={basePath}
        preserve={preserve}
        dict={dict}
      />

      <ListingSupport dict={dict} />

      <JsonLd locale={locale} page={result.page} />
    </main>
  );
}

/**
 * Inline JSON-LD: WebPage + BreadcrumbList. Server-rendered into the HTML
 * at first byte — Google's crawler doesn't need to wait for JS.
 */
function JsonLd({ locale, page }: { locale: Locale; page: number }) {
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const basePath = `${localePrefix}/currencies`;
  const url = `${SITE_URL}${basePath}${page > 1 ? `/page/${page}` : ''}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: 'All Cryptocurrencies — ChangeNOW',
        inLanguage: locale,
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}${localePrefix || '/'}` },
          { '@type': 'ListItem', position: 2, name: 'Currencies', item: `${SITE_URL}${basePath}` },
          ...(page > 1
            ? [{ '@type': 'ListItem', position: 3, name: `Page ${page}`, item: url }]
            : []),
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

export { NOINDEX_PAGE_FROM };
