import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CurrenciesPage } from '@/components/currencies/CurrenciesPage';
import { getCurrencies } from '@/lib/api/currencies';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { applyListing, type ListingSort } from '@/lib/currencies/listing';
import { loadDict } from '@/lib/i18n';
import { createT } from '@/lib/i18n/createT';

// ISR every minute — same cadence as the homepage. The catalog itself is
// cached for an hour by getCurrencies(); this revalidate covers any other
// dynamic content the page might pick up later.
export const revalidate = 60;

const LOCALE_SET = new Set<string>(LOCALES);

function pickSort(value: string | string[] | undefined): ListingSort {
  const v = Array.isArray(value) ? value[0] : value;
  return v === 'abc' ? 'abc' : 'rank';
}

function pickQ(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? '').toString().slice(0, 64).trim();
}

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const sp = await searchParams;
  const q = pickQ(sp.q);
  const sort = pickSort(sp.sort);

  return buildMetadata({ locale, page: 1, q, sort });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const sp = await searchParams;

  return (
    <CurrenciesPage
      locale={locale}
      page={1}
      q={pickQ(sp.q)}
      sort={pickSort(sp.sort)}
    />
  );
}

// ─── Metadata helper, shared with /currencies/page/[page] ─────────────

export async function buildMetadata({
  locale,
  page,
  q,
}: {
  locale: Locale;
  page: number;
  q: string;
  sort: ListingSort;
}): Promise<Metadata> {
  const dict = await loadDict(locale);
  const t = createT(dict);

  // Pull a count for the description without paying for it twice — same
  // call gets cached.
  const count = (await getCurrencies()).length;

  const baseTitle = t('META.CURRENCIES.TITLE');
  const suffix = page > 1 ? t('META.CURRENCIES.PAGE_SUFFIX', { page }) : '';
  const title = `${baseTitle}${suffix}`;
  const description = t('META.CURRENCIES.DESCRIPTION', { count });

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const basePath = `${localePrefix}/currencies`;

  // Canonical is always the base — pagination doesn't get its own canonical
  // (matches legacy and avoids duplicate-page risk for thin SERP coverage).
  const canonical = `${SITE_URL}${basePath}`;

  // Locale alternates — every supported locale points at /currencies in
  // its own prefix. EN gets x-default; en-gb is intentionally absent
  // (served by another app — Q14).
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${SITE_URL}${l === DEFAULT_LOCALE ? '' : `/${l}`}/currencies`;
  }
  languages['x-default'] = `${SITE_URL}/currencies`;

  // noindex,follow for deep pagination — preserve PageRank flow without
  // letting thin pages clutter the index. See plan §5 #5.
  const indexable = !q && page <= 10;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    robots: {
      index: indexable,
      follow: true,
    },
    other: {
      ...(page > 1
        ? { 'link-prev': `${basePath}${page === 2 ? '' : `/page/${page - 1}`}` }
        : {}),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  };
}
