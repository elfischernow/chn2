import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

import { LOCALES, DEFAULT_LOCALE } from './lib/config';

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));

// Non-default locales used to constrain `:lang` in redirect sources so they
// don't accidentally swallow paths like `/api` or static asset routes.
const NON_DEFAULT_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE).join('|');
const LANG = `:lang(${NON_DEFAULT_LOCALES})`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  // Pin Turbopack and file-tracing to this project. Without this, the
  // reference repos under `legacy-projects/` (with their own lockfiles) make
  // Next walk up the FS looking for a shared parent and pick `/Users/Elias`,
  // which has no `app/` and explodes the build.
  turbopack: {
    root: PROJECT_ROOT,
  },
  outputFileTracingRoot: PROJECT_ROOT,
  outputFileTracingExcludes: {
    '*': ['./legacy-projects/**'],
  },

  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 600,
    },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'content-api.changenow.io',
        pathname: '/uploads/**',
      },
      { protocol: 'https', hostname: 'changenow.io' },
    ],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
  },

  async redirects() {
    // Legacy / pagination normalization. Mirrors prod behavior verified by
    // `curl -I` against changenow.io — see docs/currencies-migration.md
    // appendix В. AMP listing (`/currencies/amp`) is intentionally not
    // listed: it 404s naturally because `amp` is not a coin link in the
    // URL Registry.
    return [
      // /currencies/page/1 → /currencies (and locale variant)
      { source: '/currencies/page/1', destination: '/currencies', permanent: true },
      {
        source: `/${LANG}/currencies/page/1`,
        destination: '/:lang/currencies',
        permanent: true,
      },

      // /currencies/:coin/page/1 → /currencies/:coin
      {
        source: '/currencies/:coin/page/1',
        destination: '/currencies/:coin',
        permanent: true,
      },
      {
        source: `/${LANG}/currencies/:coin/page/1`,
        destination: '/:lang/currencies/:coin',
        permanent: true,
      },

      // /currencies/:coin/:coinTo/page/1 → /currencies/:coin/:coinTo
      {
        source: '/currencies/:coin/:coinTo/page/1',
        destination: '/currencies/:coin/:coinTo',
        permanent: true,
      },
      {
        source: `/${LANG}/currencies/:coin/:coinTo/page/1`,
        destination: '/:lang/currencies/:coin/:coinTo',
        permanent: true,
      },

      // /currencies/exchange/:coin → /currencies (legacy redirect)
      { source: '/currencies/exchange/:coin', destination: '/currencies', permanent: true },
      {
        source: `/${LANG}/currencies/exchange/:coin`,
        destination: '/:lang/currencies',
        permanent: true,
      },

      // AMP per-coin / per-pair → canonical (matches prod)
      {
        source: '/currencies/:coin/amp',
        destination: '/currencies/:coin',
        permanent: true,
      },
      {
        source: `/${LANG}/currencies/:coin/amp`,
        destination: '/:lang/currencies/:coin',
        permanent: true,
      },
      {
        source: '/currencies/:coin/:coinTo/amp',
        destination: '/currencies/:coin/:coinTo',
        permanent: true,
      },
      {
        source: `/${LANG}/currencies/:coin/:coinTo/amp`,
        destination: '/:lang/currencies/:coin/:coinTo',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // `camera=(self)` — needed for the QR scanner in private-transfer
          // mode (PrivateView's `getUserMedia` call). The empty allowlist
          // `()` blocks the request before the browser shows a permission
          // prompt, so users see "access denied" without ever being asked.
          // Mic and geolocation stay denied — no feature uses them.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: buildCsp() },
        ],
      },
    ];
  },
};

// CSP. Constraints that shape the choice of source list:
//   - Pages must remain statically rendered (see `[lang]/layout.tsx`); a
//     nonce-based policy would force dynamic rendering app-wide.
//   - Next.js streams RSC payloads through a long sequence of inline
//     `<script>self.__next_f.push(…)</script>` blocks whose contents change
//     per render. We can't enumerate hashes for these, so the only
//     statically-renderable option is `'unsafe-inline'` for scripts.
//   - Per CSP3, mixing `'unsafe-inline'` with a hash makes browsers ignore
//     `'unsafe-inline'` entirely — which would block the RSC stream. We
//     therefore omit the hash for the theme bootstrap and rely on
//     `'unsafe-inline'` for both it and the framework's inline payload.
//     The trade is intentional: tightening this further requires either
//     experimental SRI (Next 14+) or moving to per-request nonces.
//   - Connect-src is `'self'`: every upstream call goes through our own
//     `/api/*` proxy, so the browser never needs cross-origin XHR.
//   - Img-src includes the two ChangeNOW asset hosts the app actually pulls
//     from (currency icons + brand assets).
function buildCsp(): string {
  const isDev = process.env.NODE_ENV !== 'production';

  // Allow the configured content API host (staging often uses a different
  // origin like content-api.bento.capital). Fall back to the prod host so
  // CI builds without env still pass.
  const contentHost = (() => {
    try {
      return new URL(
        process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io',
      ).origin;
    } catch {
      return 'https://content-api.changenow.io';
    }
  })();

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'object-src': ["'none'"],
    'script-src': [
      "'self'",
      // Required for the theme bootstrap and Next.js RSC streaming chunks.
      // See header comment for why this can't tighten to a hash today.
      "'unsafe-inline'",
      // React DevTools and Fast Refresh use eval() in development only.
      ...(isDev ? ["'unsafe-eval'"] : []),
      // TradingView fallback chart loads `tv.js` from S3.
      'https://s3.tradingview.com',
    ],
    // styled-jsx + the inline keyframes in `loading.tsx` need
    // `'unsafe-inline'`; switching to nonce-based styles would force
    // dynamic rendering.
    'style-src': ["'self'", "'unsafe-inline'", 'https://s3.tradingview.com'],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      contentHost,
      'https://content-api.changenow.io',
      'https://changenow.io',
      // TradingView serves coin glyphs from its own static CDN.
      'https://s3.tradingview.com',
      'https://www.tradingview.com',
    ],
    'font-src': ["'self'", 'data:', 'https://s3.tradingview.com'],
    'connect-src': [
      "'self'",
      // HMR websocket in dev only — production stays origin-locked.
      ...(isDev ? ['ws:', 'wss:'] : []),
      // TradingView widget pulls market data through its own websockets.
      'https://www.tradingview.com',
      'wss://data.tradingview.com',
      'wss://widgetdata.tradingview.com',
      // GA4 collect endpoint — the inline analytics script POSTs / sendBeacons here.
      'https://www.google-analytics.com',
      // Sentry ingestion. The wildcard covers every project's DSN host
      // (o<orgId>.ingest.sentry.io) without leaking the org id into config.
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
    ],
    'frame-src': ["'self'", 'https://www.tradingview.com', 'https://s.tradingview.com'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  const parts = Object.entries(directives).map(
    ([directive, values]) => `${directive} ${values.join(' ')}`,
  );
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

// Wrap with Sentry. Source-map upload only runs when SENTRY_AUTH_TOKEN is
// present (CI), so local dev `next build` never tries to talk to Sentry.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Strip source maps from the public bundle after upload — only Sentry's
  // backend keeps a copy for symbolication.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Keep the build quiet when no auth token is present.
  disableLogger: true,
  telemetry: false,
});

