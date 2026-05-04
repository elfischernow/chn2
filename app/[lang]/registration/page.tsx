import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthFlow } from '@/components/auth/AuthFlow';
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
  title: 'Create account',
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

export default async function RegistrationPage({ params, searchParams }: PageProps) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const localePrefix = localePrefixOf(lang);

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
                initialForm="register"
                postAuthTarget={
                  serverTarget === POST_AUTH_RELOAD
                    ? localePrefix + '/pro/balance'
                    : serverTarget
                }
                localePrefix={localePrefix}
                dict={dict}
              />
            </div>
            <WelcomePanel dict={dict} />
          </div>
        </div>
      </main>
    </div>
  );
}
