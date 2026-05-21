import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ExchangePage } from '@/components/exchange/ExchangePage';
import { type Currency, getCurrencies } from '@/lib/api/currencies';
import { DEFAULT_LOCALE, type Locale, LOCALES, SITE_URL } from '@/lib/config';
import { loadDict, pickI18n } from '@/lib/i18n';
import { LocalizationProvider } from '@/lib/i18n/client';
import { getSession } from '@/lib/auth/server';

const LOCALE_SET = new Set<string>(LOCALES);

// /exchange reads `searchParams` in `generateMetadata` (per-pair canonical
// + title). Mark it explicitly dynamic so Next 16 doesn't try to cache an
// SSR HTML that won't match the bundle's per-request initial state.
export const dynamic = 'force-dynamic';

const STATIC_METADATA = {
  title: 'Exchange Crypto | ChangeNOW',
  description:
    'Instant crypto exchange. Swap 1300+ assets in minutes — no account required.',
} as const satisfies Metadata;

// Per-pair canonical: when /exchange is opened with `?from=&to=` we point
// the canonical at the dedicated pair landing (`/currencies/<from>/<to>`),
// matching legacy `getCurrenciesCanonical` from `set-transaction-step`.
// SEO equity from query-string deep-links collapses onto the pair page.
function resolveCurrencyByParam(
  raw: string,
  network: string | null,
  currencies: readonly Currency[],
): Currency | undefined {
  const ticker = raw.toLowerCase();
  if (network) {
    const hit = currencies.find(
      (c) => c.currentTicker === ticker && c.network === network.toLowerCase(),
    );
    if (hit) return hit;
  }
  const byCanonical = currencies.find((c) => c.ticker === ticker);
  if (byCanonical) return byCanonical;
  return currencies
    .filter((c) => c.currentTicker === ticker)
    .sort((a, b) => a.position - b.position)[0];
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) return STATIC_METADATA;
  const locale = lang as Locale;
  const sp = await searchParams;
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  const fromRaw =
    typeof sp.from === 'string'
      ? sp.from
      : typeof sp.cur_from === 'string'
        ? sp.cur_from
        : null;
  const toRaw =
    typeof sp.to === 'string'
      ? sp.to
      : typeof sp.cur_to === 'string'
        ? sp.cur_to
        : null;
  if (!fromRaw || !toRaw) {
    // No pair → no special canonical; ship the static defaults.
    return {
      ...STATIC_METADATA,
      alternates: { canonical: `${SITE_URL}${localePrefix}/exchange` },
    };
  }

  const currencies = await getCurrencies();
  const from = resolveCurrencyByParam(
    fromRaw,
    typeof sp.fromNetwork === 'string' ? sp.fromNetwork : null,
    currencies,
  );
  const to = resolveCurrencyByParam(
    toRaw,
    typeof sp.toNetwork === 'string' ? sp.toNetwork : null,
    currencies,
  );
  if (!from || !to || !from.link || !to.link) {
    return {
      ...STATIC_METADATA,
      alternates: { canonical: `${SITE_URL}${localePrefix}/exchange` },
    };
  }

  const fromTicker = from.currentTicker.toUpperCase();
  const toTicker = to.currentTicker.toUpperCase();
  // The root layout's `template: '%s | ChangeNOW'` would otherwise double
  // up our suffix — use `absolute` so the per-pair title ships verbatim.
  const titleStr = `Exchange ${from.name || fromTicker} (${fromTicker}) to ${to.name || toTicker} (${toTicker}) | ChangeNOW`;
  const description = `Swap ${from.name || fromTicker} (${fromTicker}) to ${to.name || toTicker} (${toTicker}) instantly. Live rates, no account, no limits.`;
  const canonical = `${SITE_URL}${localePrefix}/currencies/${from.link}/${to.link}`;

  return {
    title: { absolute: titleStr },
    description,
    alternates: { canonical },
    openGraph: { title: titleStr, description, url: canonical },
  };
}

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
