import type { Metadata, Viewport } from 'next';
import { Roboto, Roboto_Flex } from 'next/font/google';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Suspense, type ReactNode } from 'react';

import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts';
import { GlobalErrorReporter } from '@/components/analytics/GlobalErrorReporter';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { LocalizedPathProvider } from '@/components/layout/LocalizedPathContext';
import { type Locale, LOCALES, RTL_LOCALES, SITE_URL } from '@/lib/config';
import { loadDict, pickI18n } from '@/lib/i18n';
import { LocalizationProvider } from '@/lib/i18n/client';

import '../globals.css';

const roboto = Roboto({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--chn-font-sans',
  display: 'swap',
});

// Header is the only place legacy code targets `Roboto Flex`. Loading the
// variable axis subset here keeps font-variation-settings in Header.module.css
// effective without dragging extra weight onto every page.
const robotoFlex = Roboto_Flex({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--chn-font-flex',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ChangeNOW — Change the way you money',
    template: '%s | ChangeNOW',
  },
  description:
    'Buy, store, exchange and use crypto in one app. Swap, stake, borrow and trade — without app-hopping or paperwork.',
  applicationName: 'ChangeNOW',
  openGraph: { type: 'website', siteName: 'ChangeNOW', url: '/' },
  twitter: { card: 'summary_large_image', site: '@ChangeNOW_io' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FAFAF7',
  width: 'device-width',
  initialScale: 1,
};

const LOCALE_SET = new Set<string>(LOCALES);

const APK_ANDROID_URL = process.env.APK_ANDROID_URL ?? '';
const MOBILE_APPS_URL = process.env.MOBILE_APPS_LINK ?? '';

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LOCALE_SET.has(lang)) notFound();
  const locale = lang as Locale;
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  const fullDict = await loadDict(locale);
  const clientDict = pickI18n(fullDict, ['HOME', 'HEADER', 'FOOTER', 'COOKIE'], true);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${roboto.variable} ${robotoFlex.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://content-api.changenow.io" />
        <link rel="dns-prefetch" href="https://content-api.changenow.io" />
      </head>
      <body data-theme="light" suppressHydrationWarning>
        {/* `next/script` is the supported way to ship inline scripts from a
            React tree — a raw <script> tag triggers React 19's "scripts
            inside React components are never executed on the client"
            warning even when the script renders fine on the server. With
            no `app/layout.tsx` in this project, `[lang]/layout.tsx` IS the
            root layout, so `beforeInteractive` is allowed (Next hoists it
            into <head> and runs it before hydration — exactly when the
            theme bootstrap needs to fire to avoid a flash). */}
        <Script id="chn-theme-bootstrap" strategy="beforeInteractive">
          {"try{var t=localStorage.getItem('theme');var resolved=t==='dark'||t==='light'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',resolved);if(document.body)document.body.setAttribute('data-theme',resolved);}catch(e){}"}
        </Script>
        {/* Bfcache safety net. React effects don't re-fire on a bfcache
            restore, leaving event listeners/intervals attached to a
            frozen snapshot — `useHashSync`'s hashchange handler, the
            estimate-debounce timer, every picker's outside-click bound
            to the previous mount. Force a fresh load.
            `location.reload()` is unreliable here: Chrome silently no-ops
            it inside a pageshow handler when DevTools is closed (the same
            path that allows bfcache in the first place), leaving the user
            on the frozen snapshot. `location.replace(location.href)`
            bypasses the quirk and also avoids polluting history with the
            pre-reload entry. */}
        <Script id="chn-bfcache-reload" strategy="afterInteractive">
          {"addEventListener('pageshow',function(e){if(e.persisted){location.replace(location.href);}});"}
        </Script>
        <AnalyticsScripts />
        <LocalizationProvider value={clientDict}>
          <LocalizedPathProvider>
            <GlobalErrorReporter />
            <div className="page-wrap">
              <Header
                locale={locale}
                dict={clientDict}
                apkAndroidUrl={APK_ANDROID_URL}
                mobileAppsUrl={MOBILE_APPS_URL}
              />
              {children}
              <Suspense fallback={null}>
                <Footer dict={clientDict} lang={locale} />
              </Suspense>
            </div>
          </LocalizedPathProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}
