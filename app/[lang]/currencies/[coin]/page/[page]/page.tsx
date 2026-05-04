import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { CoinPageView } from '@/components/currencies/CoinPageView';
import { getCoinPage } from '@/lib/api/content/coin-page';
import type { CoinPage } from '@/lib/api/content/types';
import { getCurrencies } from '@/lib/api/currencies';
import { lookup } from '@/lib/api/url-registry';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { applyListing } from '@/lib/currencies/listing';
import { loadDict, pickI18n } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

/**
 * Paginated coin page — the same hero/blocks as `/currencies/[coin]`, but
 * the embedded `currencies-table` block paginates. Matches legacy
 * `/currencies/:coin/page/:n` semantics.
 *
 * Page 1 is canonical at the un-suffixed URL; this route 301s page=1 to
 * the base path to avoid duplicate content. Pages past the table's
 * `totalPages` 404 so crawlers don't burn budget on empty surfaces.
 */
export const dynamic = 'force-dynamic';

const LOCALE_SET = new Set<string>(LOCALES);
const TABLE_PER_PAGE = 10;

interface PageProps {
  params: Promise<{ lang: string; coin: string; page: string }>;
}

function parsePage(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export default async function Page({ params }: PageProps) {
  const { lang, coin, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const slug = decodeURIComponent(coin).toLowerCase();
  const tablePage = parsePage(pageRaw);
  if (tablePage === null) notFound();

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  if (tablePage === 1) redirect(`${localePrefix}/currencies/${slug}`);

  const url = `/currencies/${slug}`;
  const entry = await lookup(url);
  if (entry?.status === 'redirect') {
    const target = entry.target.startsWith('/') ? entry.target : `/${entry.target}`;
    redirect(`${localePrefix}${target}`);
  }
  if (entry?.status === 'gone') notFound();

  const coinPage = await resolveCoinPage(slug, locale);
  if (!coinPage) notFound();

  // Avoid serving empty paginated surfaces — crawlers should land on a 404
  // beyond the last real page rather than crawl through empty templates.
  const all = await getCurrencies();
  const others = all.filter((c) => c.link !== slug);
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

  return <CoinPageView locale={locale} page={coinPage} dict={dict} tablePage={tablePage} />;
}

async function resolveCoinPage(slug: string, locale: Locale): Promise<CoinPage | null> {
  const fromStrapi = await getCoinPage(slug, locale);
  if (fromStrapi) return fromStrapi;
  const all = await getCurrencies();
  const c = all.find((x) => x.link === slug);
  if (!c) return null;
  return {
    id: -1,
    title: `${c.name} (${c.currentTicker.toUpperCase()})`,
    metaTitle: null,
    metaDescription: null,
    description: '',
    link: c.link,
    ticker: c.currentTicker,
    name: c.name,
    network: c.network,
    iconUrl: c.iconUrl,
    blocks: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, coin, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const slug = decodeURIComponent(coin).toLowerCase();
  const tablePage = parsePage(pageRaw);
  if (!tablePage || tablePage < 2) return {};

  const entry = await lookup(`/currencies/${slug}`);
  if (entry?.status === 'redirect' || entry?.status === 'gone') return {};

  const coinPage = await resolveCoinPage(slug, locale);
  if (!coinPage) notFound();

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const dict = await loadDict(locale);
  const t = createT(dict);

  // Canonical points at the base coin URL — paginated surfaces don't get
  // their own canonical (mirrors the listing's strategy).
  const canonical = `${SITE_URL}${localePrefix}/currencies/${coinPage.link}`;

  const baseTitle =
    coinPage.metaTitle ||
    t('META.COIN.TITLE', `Exchange ${coinPage.name} (${coinPage.ticker.toUpperCase()})`, {
      name: coinPage.name,
      ticker: coinPage.ticker.toUpperCase(),
    });
  const title = `${baseTitle} — Page ${tablePage}`;
  const description =
    coinPage.metaDescription ||
    t(
      'META.COIN.DESCRIPTION',
      `Instantly exchange ${coinPage.name} on ChangeNOW. Live rates, no account, no limits.`,
      { name: coinPage.name, ticker: coinPage.ticker.toUpperCase() },
    );

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      // Deep table pages don't deserve their own SERP slot — let the engine
      // walk pagination via in-page links but stop indexing them.
      index: tablePage <= 5,
      follow: true,
    },
    openGraph: { title, description, url: canonical, type: 'website' },
  };
}
