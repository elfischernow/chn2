import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { CurrenciesPage } from '@/components/currencies/CurrenciesPage';
import { getCurrencies } from '@/lib/api/currencies';
import { DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/config';
import { applyListing, type ListingSort } from '@/lib/currencies/listing';

import { buildMetadata } from '../../page';

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

function parsePage(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

interface PageProps {
  params: Promise<{ lang: string; page: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { lang, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) return {};
  const locale = lang as Locale;
  const page = parsePage(pageRaw);
  if (!page || page < 2) return {};
  const sp = await searchParams;
  return buildMetadata({
    locale,
    page,
    q: pickQ(sp.q),
    sort: pickSort(sp.sort),
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { lang, page: pageRaw } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const page = parsePage(pageRaw);
  if (page === null) notFound();
  // Page 1 is canonical at /currencies — already redirected statically by
  // next.config.ts. Belt-and-braces redirect here in case the static rule
  // doesn't fire (e.g. when search params are present).
  if (page === 1) {
    const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    redirect(`${localePrefix}/currencies`);
  }

  const sp = await searchParams;
  const q = pickQ(sp.q);
  const sort = pickSort(sp.sort);

  // notFound for pages past the end so we don't ship empty paginated pages
  // that bots might keep crawling.
  const all = await getCurrencies();
  const result = applyListing(all, { q, sort, page, perPage: 50 });
  if (page > result.totalPages) notFound();

  return <CurrenciesPage locale={locale} page={page} q={q} sort={sort} />;
}
