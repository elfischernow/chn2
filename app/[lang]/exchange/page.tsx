import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ExchangePage } from '@/components/exchange/ExchangePage';
import { getCurrencies } from '@/lib/api/currencies';
import { type Locale, LOCALES } from '@/lib/config';
import { loadDict, pickI18n } from '@/lib/i18n';
import { LocalizationProvider } from '@/lib/i18n/client';
import { getSession } from '@/lib/auth/server';

// Per-pair canonical metadata is set client-side from URL params (the
// catalog name lookup needs the same currency list the form already loads).
// The static defaults here cover the no-params landing.
export const metadata: Metadata = {
  title: 'Exchange Crypto | ChangeNOW',
  description:
    'Instant crypto exchange. Swap 1300+ assets in minutes — no account required.',
};

const LOCALE_SET = new Set<string>(LOCALES);

export default async function ExchangeRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;

  // Pull just the namespaces this page renders. `EXCHANGE_STEPPER` covers
  // the form labels, ToS copy, useful-tips items, and the high-network-fees
  // modal text. `EXCHANGE.` covers the CTA labels (BUTTON_TEXT*) the
  // SetTransactionStep relied on.
  const fullDict = await loadDict(locale);
  const clientDict = pickI18n(
    fullDict,
    ['EXCHANGE_STEPPER', 'EXCHANGE.', 'MAIN.TOOLTIP'],
    true,
  );

  // Currencies + session resolved on the server so the calculator can render
  // its first frame with real data and an accurate auth state — same model
  // the homepage uses for the SwapWidget.
  const [currencies, session] = await Promise.all([getCurrencies(), getSession()]);

  return (
    <LocalizationProvider value={clientDict}>
      <ExchangePage
        currencies={currencies}
        session={session}
        locale={locale}
      />
    </LocalizationProvider>
  );
}
