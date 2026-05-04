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
 * Paginated pair page — sibling of `/currencies/[coin]/page/[N]`. Same
 * pagination semantics: hero/blocks render once; only the embedded
 * `currencies-table` paginates through counter-coin alternatives.
 */
export const dynamic = 'force-dynamic';

const LOCALE_SET = new Set<string>(LOCALES);
const TABLE_PER_PAGE = 10;

interface PageProps {
  params: Promise<{ lang: string; coin: string; coinTo: string; page: string }>;
}

function parsePage(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export default async function Page({ params }: PageProps) {
  const { lang, coin, coinTo, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const fromSlug = decodeURIComponent(coin).toLowerCase();
  const toSlug = decodeURIComponent(coinTo).toLowerCase();
  if (fromSlug === toSlug) notFound();
  const tablePage = parsePage(pageRaw);
  if (tablePage === null) notFound();

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  if (tablePage === 1) redirect(`${localePrefix}/currencies/${fromSlug}/${toSlug}`);

  const url = `/currencies/${fromSlug}/${toSlug}`;
  const entry = await lookup(url);
  if (entry?.status === 'redirect') {
    const target = entry.target.startsWith('/') ? entry.target : `/${entry.target}`;
    redirect(`${localePrefix}${target}`);
  }
  if (entry?.status === 'gone') notFound();

  const pairPage = await resolvePairPage(fromSlug, toSlug, locale);
  if (!pairPage) notFound();

  const all = await getCurrencies();
  const others = all.filter((c) => c.link !== fromSlug && c.link !== toSlug);
  const totalPages = Math.max(1, Math.ceil(others.length / TABLE_PER_PAGE));
  if (tablePage > totalPages) notFound();

  const fullDict = await loadDict(locale);
  const dict = pickI18n(fullDict, [
    'CURRENCIES_TABLE',
    'CURRENCIES_PAGE',
    'CURRENCIES_PAGINATION',
    'BREADCRUMBS',
    'META',
    'MAIN',
  ]);

  return <PairPageView locale={locale} page={pairPage} dict={dict} tablePage={tablePage} />;
}

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
  const { lang, coin, coinTo, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const fromSlug = decodeURIComponent(coin).toLowerCase();
  const toSlug = decodeURIComponent(coinTo).toLowerCase();
  const tablePage = parsePage(pageRaw);
  if (!tablePage || tablePage < 2) return {};

  const entry = await lookup(`/currencies/${fromSlug}/${toSlug}`);
  if (entry?.status === 'redirect' || entry?.status === 'gone') return {};

  const page = await resolvePairPage(fromSlug, toSlug, locale);
  if (!page) notFound();

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const dict = await loadDict(locale);
  const t = createT(dict);
  const fromTicker = page.ticker.toUpperCase();
  const toTicker = page.counter.ticker.toUpperCase();
  const baseTitle =
    page.metaTitle ||
    t(
      'META.PAIR.TITLE',
      `Exchange ${page.name} (${fromTicker}) to ${page.counter.name} (${toTicker})`,
      { fromName: page.name, fromTicker, toName: page.counter.name, toTicker },
    );
  const title = `${baseTitle} — Page ${tablePage}`;
  const description =
    page.metaDescription ||
    t(
      'META.PAIR.DESCRIPTION',
      `Convert ${page.name} to ${page.counter.name} instantly on ChangeNOW.`,
      { fromName: page.name, fromTicker, toName: page.counter.name, toTicker },
    );

  // Canonical points back to the un-paginated pair URL — matches /currencies
  // listing strategy.
  const canonical = `${SITE_URL}${localePrefix}/currencies/${page.link}/${page.counter.link}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: tablePage <= 5, follow: true },
    openGraph: { title, description, url: canonical, type: 'website' },
  };
}
