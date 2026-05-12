import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CryptoLoanPage } from '@/components/crypto-loan/CryptoLoanPage';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';

const LOCALE_SET = new Set<string>(LOCALES);

// `absolute` skips the root layout's `%s | ChangeNOW` template — the
// title already carries the suffix, otherwise it would double up.
const STATIC_META = {
  title: { absolute: 'Crypto Loans: Borrow Against Your Bitcoin & Crypto | ChangeNOW' },
  description:
    'Get a crypto loan in minutes — keep your Bitcoin and other assets as collateral and borrow stablecoins or crypto at competitive rates. No credit checks, unlimited loan terms.',
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
    alternates: { canonical: `${SITE_URL}${localePrefix}/crypto-loan` },
    openGraph: {
      title: STATIC_META.title.absolute,
      description: STATIC_META.description,
      url: `${SITE_URL}${localePrefix}/crypto-loan`,
    },
  };
}

export default async function CryptoLoanRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  return <CryptoLoanPage />;
}
