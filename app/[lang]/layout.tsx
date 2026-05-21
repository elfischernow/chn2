import type { Metadata, Viewport } from 'next';
import { Roboto, Roboto_Flex } from 'next/font/google';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Suspense, type ReactNode } from 'react';

import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts';
import { GlobalErrorReporter } from '@/components/analytics/GlobalErrorReporter';
import { CookieWarning } from '@/components/cookies/CookieWarning';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { LocalizedPathProvider } from '@/components/layout/LocalizedPathContext';
import { ZendeskWidget } from '@/components/support/ZendeskWidget';
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
        {/* Bfcache restore handler. React effects don't re-fire on
            bfcache restore — the calculator skeleton, header dropdowns
            and outside-click handlers all stay bound to the previous
            mount and silently die. The fix is to force a real navigation
            on restore. Two pitfalls this works around:
              1. `location.reload()` / `location.replace()` invoked
                 synchronously inside a pageshow handler are documented
                 to be silently no-oped by Chrome with DevTools closed
                 (the same condition that enables bfcache) and on
                 certain Safari paths. `setTimeout(0)` escapes the
                 handler frame so the call runs in a fresh task where
                 it always proceeds.
              2. With `afterInteractive`, the listener wouldn't be
                 attached until after hydration. `beforeInteractive`
                 lands the script in the pre-hydration queue so the
                 listener exists from first paint forward, regardless
                 of whether the visit was direct or a bfcache restore.
            Note: this is the *only* mechanism currently working in
            this app. Setting `Cache-Control: no-store` (the spec-
            defined opt-out) was attempted via both `proxy.ts` and
            `next.config.ts.headers()` — Next 16 hard-codes
            `no-cache, must-revalidate` on every app-router page
            response and ignores both override paths. A Service
            Worker would be the next layer if this script proves
            insufficient in the field. */}
        <Script id="chn-bfcache-reload" strategy="beforeInteractive">
          {"addEventListener('pageshow',function(e){if(e.persisted){setTimeout(function(){location.reload();},0);}});"}
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
            {/* Page-chrome overlays. Rendered outside `.page-wrap` so they
                live on top of every route's layout without ever pushing
                content. Both are SSR-safe: cookie banner reads
                `document.cookie` in an effect (no hydration mismatch);
                Zendesk script is `next/script lazyOnload` so it loads
                after the browser is idle and never blocks LCP. */}
            <CookieWarning dict={clientDict} />
            <ZendeskWidget />
            {/* Overlay root. Every popover/modal/dropdown rendered via the
                `<Overlay>` primitive portals into this node. Sits outside
                `.page-wrap` so it never inherits the page's stacking
                contexts (`.hero > *` z-index, `.widget` backdrop-filter,
                transformed sections) — z-index tokens in globals.css then
                apply against the body root, which is what makes them
                actually predictable. */}
            <div id="overlay-root" />
          </LocalizedPathProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}
