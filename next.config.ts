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

      // /registration → /authorization (unified entry form, see
      // components/auth/AuthFlow/EntryForm.tsx + docs/auth-migration-plan.md
      // §"unification"). Done at the next.config layer because Next 16's
      // default-locale stripping eats the `/en/` prefix before route matching,
      // so a server-component `redirect()` inside `[lang]/registration/page.tsx`
      // never executes for the `/registration` (no prefix) request — it ends
      // up rendering the layout's not-found instead.
      { source: '/registration', destination: '/authorization', permanent: true },
      {
        source: `/${LANG}/registration`,
        destination: '/:lang/authorization',
        permanent: true,
      },
    ];
  },

  async headers() {
    // CSP is suppressed in dev so third-party tooling that injects scripts
    // into the running app (Figma MCP capture, browser-side recorders,
    // etc.) can talk to whatever origins they need without having to be
    // pre-allowlisted. Production still ships the full policy below. If
    // you're debugging a CSP-related issue specifically, set
    // `CSP_DEV_ENABLE=1` to re-enable it locally.
    const cspEnabled =
      process.env.NODE_ENV === 'production' || process.env.CSP_DEV_ENABLE === '1';
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
          ...(cspEnabled ? [{ key: 'Content-Security-Policy', value: buildCsp() }] : []),
        ],
      },
      {
        // Bfcache opt-out probe — checks whether prod mode honors the
        // override that dev mode ignores. `Cache-Control: no-store` is
        // the spec-defined trigger that disqualifies a page from
        // bfcache eligibility across every modern browser. `has` scopes
        // the rule to top-level navigations (browsers send
        // `Sec-Fetch-Dest: document` only for those — `image`/`script`/
        // `empty` for assets and RSC fetches), so static asset caching
        // is untouched.
        source: '/:path*',
        has: [
          { type: 'header', key: 'sec-fetch-dest', value: 'document' },
        ],
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
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
//   - Connect-src adds the vip-api and content-api hosts: the calculator
//     calls these directly from the browser (no Next proxy in front), so
//     the CSP needs to allow the cross-origin XHR. Hosts are sourced from
//     env so dev/preview/prod can each point at their own upstream.
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
        process.env.NEXT_PUBLIC_CONTENT_API_BASE ??
          process.env.CONTENT_API_BASEURL ??
          'https://content-api.changenow.io',
      ).origin;
    } catch {
      return 'https://content-api.changenow.io';
    }
  })();
  // The vip-api is the upstream for the calculator's `/v1.3/exchange/estimate`,
  // `/v1/cashback/estimate`, `/v1.1/transactions`, and the auth flows.
  // Same fallback chain — defaults to the bento.capital host the legacy
  // SPA uses when nothing is set.
  const vipApiHost = (() => {
    try {
      return new URL(
        process.env.NEXT_PUBLIC_VIP_API_BASE ?? 'https://vip-api.bento.capital',
      ).origin;
    } catch {
      return 'https://vip-api.bento.capital';
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
      // Trustpilot bootstrap loader for the hero TrustBox widget.
      'https://widget.trustpilot.com',
      // Zendesk Messenger boot + chunked widget code. The snippet first
      // hits zdassets, then chains into zendesk.com for the chat surface.
      'https://static.zdassets.com',
      'https://*.zdassets.com',
      'https://*.zendesk.com',
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
      // Trustpilot widget pulls its star/logo art from these subdomains.
      'https://*.trustpilot.com',
      'https://*.trustpilot.net',
      // Zendesk Messenger ships avatars + uploaded attachments from these
      // hosts. `zdusercontent.com` is the agent/user attachment CDN.
      'https://*.zendesk.com',
      'https://*.zdassets.com',
      'https://*.zdusercontent.com',
      // Prediction-market event thumbnails. Polymarket hosts these on S3;
      // the bucket name is stable but new events drift across regions, so
      // we allow the parent `amazonaws.com` umbrella rather than pinning
      // a single subdomain.
      'https://*.amazonaws.com',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://s3.tradingview.com',
      // Zendesk Messenger ships its own font bundle.
      'https://*.zdassets.com',
    ],
    'connect-src': [
      "'self'",
      // HMR websocket in dev only — production stays origin-locked.
      ...(isDev ? ['ws:', 'wss:'] : []),
      // Direct upstream calls: the calculator and auth flows talk to
      // vip-api without a Next proxy in front.
      vipApiHost,
      // The cashback upsell's NOW→USD price lookup hits content-api
      // directly from the browser.
      contentHost,
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
      // Zendesk Messenger long-polls + opens a WebSocket once a chat
      // session starts. Same wildcard set the widget's docs recommend.
      'https://*.zendesk.com',
      'wss://*.zendesk.com',
      'https://*.zdassets.com',
    ],
    'frame-src': [
      "'self'",
      'https://www.tradingview.com',
      'https://s.tradingview.com',
      // Trustpilot renders the widget body inside an iframe served from
      // this host once the bootstrap script attaches to our node.
      'https://widget.trustpilot.com',
      // Zendesk Messenger renders the chat surface inside an iframe
      // proxied off the customer's tenant subdomain.
      'https://*.zendesk.com',
    ],
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

