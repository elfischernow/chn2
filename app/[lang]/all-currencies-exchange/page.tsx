import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCurrencies, type Currency } from '@/lib/api/currencies';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { loadDict } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

import styles from './all-currencies-exchange.module.css';

/**
 * `/all-currencies-exchange` — HTML site-map of every coin in the catalog,
 * grouped A–Z. Pure server-render, no JS dependency. Mirrors legacy SEO
 * link-distribution surface.
 *
 * The list is exhaustive (1300+ coins). Lighter than the XML sitemap — no
 * pair URLs here; that's what XML covers.
 */
export const revalidate = 60;

const LOCALE_SET = new Set<string>(LOCALES);

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;

  const [currencies, fullDict] = await Promise.all([getCurrencies(), loadDict(locale)]);
  const t = createT(fullDict);
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const groups = groupAlphabetically(currencies);

  return (
    <main className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a href={localePrefix || '/'}>{t('BREADCRUMBS.HOME')}</a>
        <span aria-hidden> / </span>
        <span aria-current="page">
          {t('ALL_CURRENCIES_EXCHANGE_PAGE.HEADER', 'All currencies — exchange index')}
        </span>
      </nav>

      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          {t('ALL_CURRENCIES_EXCHANGE_PAGE.HEADER', 'All currencies — exchange index')}
        </h1>
        <p className={styles.heroSub}>
          {t(
            'ALL_CURRENCIES_EXCHANGE_PAGE.DESCRIPTION',
            `Browse every coin we support, A–Z. Click any name to open its exchange page.`,
            { count: currencies.length },
          )}
        </p>
      </header>

      <nav className={styles.azNav} aria-label="Letter index">
        {groups.map(({ letter }) => (
          <a key={letter} href={`#letter-${letter}`} className={styles.azLink}>
            {letter}
          </a>
        ))}
      </nav>

      <div className={styles.groups}>
        {groups.map(({ letter, items }) => (
          <section key={letter} id={`letter-${letter}`} className={styles.group}>
            <h2 className={styles.groupTitle}>{letter}</h2>
            <ul className={styles.list}>
              {items.map((c) => (
                <li key={`${c.link}-${c.ticker}`}>
                  <a
                    href={`${localePrefix}/currencies/${c.link || c.currentTicker}`}
                    className={styles.itemLink}
                  >
                    <span className={styles.itemName}>{c.name || c.currentTicker.toUpperCase()}</span>
                    <span className={styles.itemTicker}>{c.currentTicker.toUpperCase()}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

interface Group {
  letter: string;
  items: Currency[];
}

function groupAlphabetically(currencies: Currency[]): Group[] {
  const buckets = new Map<string, Currency[]>();
  for (const c of currencies) {
    const first = (c.name || c.currentTicker).slice(0, 1).toUpperCase();
    const key = /^[A-Z]$/.test(first) ? first : '#';
    const arr = buckets.get(key) ?? [];
    arr.push(c);
    buckets.set(key, arr);
  }
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return sortedKeys.map((letter) => ({
    letter,
    items: (buckets.get(letter) ?? []).sort((x, y) => x.name.localeCompare(y.name)),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const dict = await loadDict(locale);
  const t = createT(dict);
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const canonical = `${SITE_URL}${localePrefix}/all-currencies-exchange`;

  const title = t(
    'ALL_CURRENCIES_EXCHANGE_PAGE.HEADER',
    'All cryptocurrencies — exchange index | ChangeNOW',
  );
  const description = t(
    'ALL_CURRENCIES_EXCHANGE_PAGE.DESCRIPTION',
    'Complete A–Z list of every coin available on ChangeNOW. Tap any to open its exchange page.',
  );

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}${l === DEFAULT_LOCALE ? '' : `/${l}`}/all-currencies-exchange`;
  }
  languages['x-default'] = `${SITE_URL}/all-currencies-exchange`;

  return {
    title,
    description,
    alternates: { canonical, languages },
    robots: { index: true, follow: true },
  };
}
