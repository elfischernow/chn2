import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthFlow, type InitialForm } from '@/components/auth/AuthFlow';
import { WelcomePanel } from '@/components/auth/WelcomePanel';
import '@/components/auth/styles.css';
import { DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/config';
import {
  POST_AUTH_RELOAD,
  resolvePostAuthTarget,
} from '@/lib/auth/post-auth';
import { getSession } from '@/lib/auth/server';
import { loadDict, pickI18n } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Sign in',
  // legacy pug template: `noindex, nofollow`
  robots: { index: false, follow: false },
};

// Auth flows must never be cached. Each request runs the session check.
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

const renderAuthGate = async (
  initialForm: InitialForm,
  { params, searchParams }: PageProps,
) => {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const localePrefix = localePrefixOf(lang);
  const resetToken =
    typeof sp.resetToken === 'string' && sp.resetToken.length > 0
      ? sp.resetToken
      : null;

  const session = await getSession();
  if (session) {
    const resolved = resolvePostAuthTarget({
      searchParams: sp,
      localePrefix,
      proExchangeMode: sp.proExchangeMode === 'true',
    });
    if (resolved !== POST_AUTH_RELOAD) redirect(resolved);
  }

  const serverTarget = resolvePostAuthTarget({
    searchParams: sp,
    localePrefix,
    proExchangeMode: sp.proExchangeMode === 'true',
  });

  const locale = (LOCALE_SET.has(lang) ? lang : DEFAULT_LOCALE) as Locale;
  const fullDict = await loadDict(locale);
  const dict = pickI18n(fullDict, ['AUTHORIZATION'], false);

  return (
    <div className="authorization-page-wrap authorization-page">
      <main>
        <div className="container">
          <div className="authorization-container">
            <div className="authorization-form">
              <AuthFlow
                initialForm={initialForm}
                postAuthTarget={
                  serverTarget === POST_AUTH_RELOAD
                    ? localePrefix + '/pro/balance'
                    : serverTarget
                }
                localePrefix={localePrefix}
                dict={dict}
                resetToken={resetToken}
              />
            </div>
            <WelcomePanel dict={dict} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default async function AuthorizationPage(props: PageProps) {
  const sp = await props.searchParams;
  // `?resetToken` from email — pre-mount the reset form. E21 fix: empty / non-string
  // tokens fall back to entry; the reset-password submit handler refuses to fire
  // without a real token.
  const resetTokenRaw =
    typeof sp.resetToken === 'string' ? sp.resetToken : null;
  const initial: InitialForm = resetTokenRaw ? 'reset-password' : 'entry';
  return renderAuthGate(initial, props);
}
