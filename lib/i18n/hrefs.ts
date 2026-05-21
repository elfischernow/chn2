import { DEFAULT_LOCALE, type Locale, SITE_URL } from '../config';

/**
 * Build an in-app href for the current Next route table.
 *
 * Trailing-slash policy: NONE. Next's router canonicalises to bare paths
 * (`/exchange`, `/buy`); a trailing slash would force a 308 round-trip on
 * every navigation and break Back-Forward cache. The blog mirrors this
 * (`localePath(locale, '/blog')` → `/blog` or `/ru/blog`).
 *
 * Use this for any link that stays inside the Next app — header nav, mega
 * menu, mobile sheet, footer items rendered from local constants.
 */
export function localeHref(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const noTrail = clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
  if (locale === DEFAULT_LOCALE) return noTrail;
  return noTrail === '/' ? `/${locale}` : `/${locale}${noTrail}`;
}

/**
 * Build an absolute href for the legacy main site (changenow.io / SITE_URL).
 *
 * Trailing-slash policy: REQUIRED (except for the bare origin). nginx on
 * the legacy site canonicalises `/buy-bitcoin` → `/buy-bitcoin/` with a
 * 301; emitting the slash up front saves the redirect hop. The blog never
 * has to call this — it always lives inside the Next router.
 *
 * Use this for cross-site links that leave the Next app: Pro cabinet,
 * `/affiliate`, legacy landing pages, anywhere `SITE_URL` is the origin.
 */
export function mainSiteHref(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withTrail = clean === '/' || clean.endsWith('/') ? clean : `${clean}/`;
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  if (withTrail === '/') return `${SITE_URL}${prefix}/`;
  return `${SITE_URL}${prefix}${withTrail}`;
}
