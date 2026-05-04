import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { CoinPageView } from '@/components/currencies/CoinPageView';
import { getCoinPage } from '@/lib/api/content/coin-page';
import type { CoinPage } from '@/lib/api/content/types';
import { getCurrencies } from '@/lib/api/currencies';
import { lookup } from '@/lib/api/url-registry';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { loadDict, pickI18n } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

// Force dynamic rendering. ISR-style `revalidate` here was masking
// notFound() with a 200-OK status (Q3 contract). The catalog + coin-page
// fetchers are cached internally (1 h via unstable_cache), so dropping
// the segment-level revalidate doesn't change the upstream load.
export const dynamic = 'force-dynamic';

const LOCALE_SET = new Set<string>(LOCALES);

interface PageProps {
  params: Promise<{ lang: string; coin: string }>;
}

/**
 * Resolve a coin URL via the URL Registry (single source of truth).
 *  - `live`     → fetch + render
 *  - `redirect` → 301 to target (with locale prefix preserved if missing)
 *  - `gone`     → notFound() — must produce HTTP 404 (Q3 contract)
 *  - `null`     → fall back to catalog lookup (registry not warm yet)
 *
 * On registry miss but catalog hit (cold-start in-pod LRU), we still
 * render — the registry is an optimization, not a gatekeeper. If even
 * the catalog has no record, 404.
 */
export default async function Page({ params }: PageProps) {
  const { lang, coin } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;

  const slug = decodeURIComponent(coin).toLowerCase();
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const url = `/currencies/${slug}`;

  const entry = await lookup(url);
  if (entry?.status === 'redirect') {
    const target = entry.target.startsWith('/') ? entry.target : `/${entry.target}`;
    redirect(`${localePrefix}${target}`);
  }
  if (entry?.status === 'gone') notFound();

  const page = await resolveCoinPage(slug, locale);
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

  return <CoinPageView locale={locale} page={page} dict={dict} />;
}

/**
 * Bridge between Strapi (rich content) and the catalog (always-present
 * baseline). When Strapi has no entry we synthesize a minimal CoinPage
 * from the catalog so default blocks still render — Q3 says "404 only
 * for real 404s", and a coin in the catalog is real.
 */
async function resolveCoinPage(slug: string, locale: Locale): Promise<CoinPage | null> {
  const fromStrapi = await getCoinPage(slug, locale);
  if (fromStrapi) return fromStrapi;

  // Fallback: synthesize from catalog.
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
  const { lang, coin } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const slug = decodeURIComponent(coin).toLowerCase();

  const entry = await lookup(`/currencies/${slug}`);
  if (entry?.status === 'redirect' || entry?.status === 'gone') return {};

  const page = await resolveCoinPage(slug, locale);
  // Status-code contract (Q3): a missing page must yield HTTP 404, not 200.
  // Calling `notFound()` from generateMetadata in addition to the default
  // export is what makes Next's framework set the response status correctly
  // — without it, the metadata pass succeeds and Next decides the route
  // resolved fine even though the render then 404s.
  if (!page) notFound();

  const dict = await loadDict(locale);
  const t = createT(dict);

  const title =
    page.metaTitle ||
    t('META.COIN.TITLE', `Exchange ${page.name} (${page.ticker.toUpperCase()})`, {
      name: page.name,
      ticker: page.ticker.toUpperCase(),
    });
  const description =
    page.metaDescription ||
    t(
      'META.COIN.DESCRIPTION',
      `Instantly exchange ${page.name} on ChangeNOW. Live rates, no account, no limits.`,
      { name: page.name, ticker: page.ticker.toUpperCase() },
    );

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const canonical = `${SITE_URL}${localePrefix}/currencies/${page.link}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}${l === DEFAULT_LOCALE ? '' : `/${l}`}/currencies/${page.link}`;
  }
  languages['x-default'] = `${SITE_URL}/currencies/${page.link}`;

  return {
    // Strapi `meta_title` already includes the "| ChangeNOW" brand tail.
    // Use `absolute` so the root layout's `template: '%s | ChangeNOW'`
    // doesn't append a second one (was producing "… | ChangeNOW | ChangeNOW").
    title: { absolute: title },
    description,
    alternates: { canonical, languages },
    openGraph: { title, description, url: canonical, type: 'website' },
    robots: { index: true, follow: true },
  };
}
