import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForPartnersPage } from '@/components/for-partners/ForPartnersPage';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';

const LOCALE_SET = new Set<string>(LOCALES);

// Single source of truth for the page's metadata. Wrapped in
// `generateMetadata` (rather than the static `metadata` export) because
// the canonical URL needs the resolved locale prefix — Next 16 forbids
// exporting both at once.
// `absolute` skips the root layout's `%s | ChangeNOW` template — the
// title already carries the suffix, otherwise it would double up.
const STATIC_META = {
  title: { absolute: 'Crypto Exchange API, Widget & Custody for Business | ChangeNOW' },
  description:
    'Cryptocurrency exchange, processing and custody for partners. 1500+ assets, 28 services, free integration, 24/7 support.',
} as const satisfies Metadata;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) return STATIC_META;
  const locale = lang as Locale;
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return {
    ...STATIC_META,
    alternates: { canonical: `${SITE_URL}${localePrefix}/for-partners` },
    openGraph: {
      title: STATIC_META.title.absolute,
      description: STATIC_META.description,
      url: `${SITE_URL}${localePrefix}/for-partners`,
    },
  };
}

export default async function ForPartnersRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  return <ForPartnersPage />;
}
