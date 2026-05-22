import { NextResponse, type NextRequest } from 'next/server';

import { lookupFastWithFreshness } from './lib/api/url-registry';
import { DEFAULT_LOCALE, LOCALES } from './lib/config';

const LOCALE_PATTERN = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);
const EN_PREFIX_PATTERN = /^\/en(\/|$)/;
// Both URL families flow through the same Registry-driven proxy
// pipeline. `/(currencies|buy)(/...)` covers `/currencies/btc`,
// `/buy/btc`, `/buy/usd/btc`, plus their locale-prefixed variants.
const REGISTRY_PATTERN = /^(?:\/[a-z]{2,3})?\/(?:currencies|buy)(?:\/|$)/;

// Demo-only gate. Hardcoded on purpose — remove when demo is over.
const DEMO_AUTH_EXPECTED = `Basic ${Buffer.from('chnw:123qweasd!?').toString('base64')}`;

function demoAuthChallenge(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="changenow demo", charset="UTF-8"',
    },
  });
}

/**
 * Strip the locale prefix from a path so it can be looked up in the
 * locale-agnostic URL Registry. `/ru/currencies/btc` → `/currencies/btc`,
 * `/ru/buy/usd/btc` → `/buy/usd/btc`.
 */
function canonicalRegistryPath(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2,3})(\/.*)$/);
  if (m && (LOCALES as readonly string[]).includes(m[1]!)) return m[2]!;
  return pathname;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (req.headers.get('authorization') !== DEMO_AUTH_EXPECTED) {
    return demoAuthChallenge();
  }

  if (EN_PREFIX_PATTERN.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(EN_PREFIX_PATTERN, '/') || '/';
    return NextResponse.redirect(url, 308);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-url', req.url);
  requestHeaders.set('x-pathname', pathname);

  // For /currencies/* AND /buy/* paths, consult the URL Registry as the
  // single source of truth (Q8). When the registry knows the URL is a
  // redirect or gone, handle it here so the response status is correct —
  // `NextResponse.rewrite()` from middleware otherwise pins the response
  // to 200 even if the rewritten page calls `notFound()`. This is the
  // explicit Q3 contract: real 404s must produce HTTP 404, not 200.
  if (REGISTRY_PATTERN.test(pathname)) {
    const canonical = canonicalRegistryPath(pathname);
    // Skip the listing roots and any pagination shape (`.../page/N`).
    // The Registry tracks live coin/pair URLs only — pagination is a
    // route-level concern handled by the page resolver, which knows
    // the page count and 404s overshoot itself.
    const isPaginationPath = /\/page\/\d+\/?$/.test(canonical);
    const isListingRoot = canonical === '/currencies' || canonical === '/buy';
    if (!isListingRoot && !isPaginationPath) {
      const { entry, registryWarm } = await lookupFastWithFreshness(canonical);

      if (entry?.status === 'redirect') {
        const locM = pathname.match(/^\/([a-z]{2,3})(\/.*)$/);
        const localePrefix =
          locM && (LOCALES as readonly string[]).includes(locM[1]!) ? `/${locM[1]}` : '';
        const target = entry.target.startsWith('/') ? entry.target : `/${entry.target}`;
        const url = req.nextUrl.clone();
        url.pathname = `${localePrefix}${target}`;
        return NextResponse.redirect(url, 301);
      }

      // `gone` and "warm registry + miss" both 404 here. Rewriting to the
      // resolver lets not-found.tsx render the UI; the status is pinned by
      // the middleware response, so the page handler's 200-default doesn't
      // override it.
      if (entry?.status === 'gone' || (registryWarm && !entry)) {
        const rewritten = req.nextUrl.clone();
        if (!LOCALE_PATTERN.test(pathname)) {
          rewritten.pathname = `/${DEFAULT_LOCALE}${pathname}`;
        }
        return NextResponse.rewrite(rewritten, {
          status: 404,
          request: { headers: requestHeaders },
        });
      }
      // Cold-start path: registry not warm yet, defer to page handler which
      // will check the catalog directly.
    }
  }

  if (LOCALE_PATTERN.test(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rewritten = req.nextUrl.clone();
  rewritten.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
}

// Next 16 proxy.ts already runs in the Node runtime by default — setting
// `runtime` here would actually error (per docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// ioredis-backed helpers like the URL Registry work natively here.

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
