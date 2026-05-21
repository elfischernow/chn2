import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/config';

// /registration was a distinct page in the legacy SPA. After the entry-form
// unification (one screen for sign-in AND sign-up), it has no UI of its own
// and permanently redirects to /authorization. Locale prefix is preserved
// and every incoming query param (?next, ?proExchangeMode, marketing UTMs
// etc.) survives intact so deep links and old email CTAs keep landing the
// user in the right place.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const LOCALE_SET = new Set<string>(LOCALES);
const localePrefixOf = (lang: string): string => {
  const locale = lang as Locale;
  return locale === DEFAULT_LOCALE || !LOCALE_SET.has(lang) ? '' : `/${locale}`;
};

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegistrationRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const prefix = localePrefixOf(lang);

  // Reserialize the query so multi-value params (e.g. an unlikely
  // `?next=foo&next=bar`) survive intact.
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const x of v) qs.append(k, x);
    } else {
      qs.append(k, v);
    }
  }
  const tail = qs.toString();
  permanentRedirect(`${prefix}/authorization${tail ? `?${tail}` : ''}`);
}
