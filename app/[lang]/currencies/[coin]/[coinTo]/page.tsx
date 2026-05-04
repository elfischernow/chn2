import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PairPageView } from '@/components/currencies/PairPageView';
import { getPairPage } from '@/lib/api/content/pair-page';
import type { CounterCurrency, PairPage } from '@/lib/api/content/types';
import { getCurrencies } from '@/lib/api/currencies';
import { lookup } from '@/lib/api/url-registry';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { loadDict, pickI18n } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

/**
 * `/currencies/[coin]/[coinTo]` — pair page. Resolution order matches the
 * single-coin page:
 *   1. URL Registry → live | redirect | gone | null.
 *   2. Strapi pair-page (rich admin content).
 *   3. Catalog fallback synthesizing FROM + TO from `/currencies/light`.
 *   4. Otherwise notFound() — must produce HTTP 404 (Q3).
 */
export const dynamic = 'force-dynamic';

const LOCALE_SET = new Set<string>(LOCALES);

interface PageProps {
  params: Promise<{ lang: string; coin: string; coinTo: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lang, coin, coinTo } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const fromSlug = decodeURIComponent(coin).toLowerCase();
  const toSlug = decodeURIComponent(coinTo).toLowerCase();
  if (fromSlug === toSlug) notFound();

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const url = `/currencies/${fromSlug}/${toSlug}`;

  const entry = await lookup(url);
  if (entry?.status === 'redirect') {
    const target = entry.target.startsWith('/') ? entry.target : `/${entry.target}`;
    redirect(`${localePrefix}${target}`);
  }
  if (entry?.status === 'gone') notFound();

  const page = await resolvePairPage(fromSlug, toSlug, locale);
  if (!page) notFound();

  const fullDict = await loadDict(locale);
  const dict = pickI18n(fullDict, [
    'CURRENCIES_TABLE',
    'CURRENCIES_PAGE',
    'CURRENCIES_PAGINATION',
    'BREADCRUMBS',
    'META',
    'MAIN',
  ]);

  return <PairPageView locale={locale} page={page} dict={dict} />;
}

/**
 * Try Strapi first; on miss, synthesize from the catalog so the page still
 * renders with default blocks. Q3: a coin/pair that exists in the catalog
 * is not a 404 — we surface admin-empty surfaces with templated content.
 */
async function resolvePairPage(
  fromSlug: string,
  toSlug: string,
  locale: Locale,
): Promise<PairPage | null> {
  const fromStrapi = await getPairPage(fromSlug, toSlug, locale);
  if (fromStrapi) return fromStrapi;

  const all = await getCurrencies();
  const from = all.find((c) => c.link === fromSlug);
  const to = all.find((c) => c.link === toSlug);
  if (!from || !to) return null;
  const counter: CounterCurrency = {
    link: to.link,
    ticker: to.currentTicker,
    name: to.name,
    network: to.network,
    iconUrl: to.iconUrl,
  };
  return {
    id: -1,
    // Mirrors legacy "<FROM_TICKER> to <TO_TICKER> Crypto Exchange" h1 used
    // when admin has no Strapi pair-page record. Was a generic dash format
    // ("Litecoin → Dogecoin") that didn't match prod's tone.
    title: `${from.currentTicker.toUpperCase()} to ${to.currentTicker.toUpperCase()} Crypto Exchange`,
    metaTitle: null,
    metaDescription: null,
    description: '',
    link: from.link,
    ticker: from.currentTicker,
    name: from.name,
    network: from.network,
    iconUrl: from.iconUrl,
    blocks: [],
    updatedAt: new Date().toISOString(),
    counter,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, coin, coinTo } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const fromSlug = decodeURIComponent(coin).toLowerCase();
  const toSlug = decodeURIComponent(coinTo).toLowerCase();
  if (fromSlug === toSlug) return {};

  const entry = await lookup(`/currencies/${fromSlug}/${toSlug}`);
  if (entry?.status === 'redirect' || entry?.status === 'gone') return {};

  const page = await resolvePairPage(fromSlug, toSlug, locale);
  if (!page) notFound();

  const dict = await loadDict(locale);
  const t = createT(dict);

  const fromTicker = page.ticker.toUpperCase();
  const toTicker = page.counter.ticker.toUpperCase();
  const title =
    page.metaTitle ||
    t(
      'META.PAIR.TITLE',
      `Exchange ${page.name} (${fromTicker}) to ${page.counter.name} (${toTicker})`,
      { fromName: page.name, fromTicker, toName: page.counter.name, toTicker },
    );
  const description =
    page.metaDescription ||
    t(
      'META.PAIR.DESCRIPTION',
      `Convert ${page.name} (${fromTicker}) to ${page.counter.name} (${toTicker}) instantly on ChangeNOW. Live rates, no account, no limits.`,
      { fromName: page.name, fromTicker, toName: page.counter.name, toTicker },
    );

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const canonical = `${SITE_URL}${localePrefix}/currencies/${page.link}/${page.counter.link}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}${l === DEFAULT_LOCALE ? '' : `/${l}`}/currencies/${page.link}/${page.counter.link}`;
  }
  languages['x-default'] = `${SITE_URL}/currencies/${page.link}/${page.counter.link}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages },
    openGraph: { title, description, url: canonical, type: 'website' },
    robots: { index: true, follow: true },
  };
}
