import 'server-only';

import { unstable_cache } from 'next/cache';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CACHE_LONG, DEFAULT_LOCALE, type Locale, STRAPI_LOCALE } from '../config';
import { getLocalFallbackDict } from './fallback';

const I18N_DIR = join(process.cwd(), 'lib', 'server', 'i18n');

// Load locale file from disk. Cached for a week — i18n only changes on deploy.
const loadLocaleFile = unstable_cache(
  async (locale: Locale): Promise<Record<string, string>> => {
    const filename = locale === 'ind' ? 'id.json' : `${locale}.json`;
    try {
      const txt = await readFile(join(I18N_DIR, filename), 'utf8');
      return JSON.parse(txt) as Record<string, string>;
    } catch {
      return {};
    }
  },
  ['i18n-file'],
  { revalidate: CACHE_LONG, tags: ['i18n'] },
);

export type TranslationDict = Record<string, string>;

/**
 * Load a full translation dictionary for a locale. Most pages only need a
 * slice of it — use `pickI18n` to reduce the payload before passing into
 * client components.
 *
 * Per-key resolution order (first match wins):
 *   1. locale Strapi cache, IF it differs from English. That's a real
 *      Strapi-managed translation.
 *   2. locale local fallback — `lib/i18n/fallback.json` (locale column).
 *      Hand-translated contextual value for a key not yet pushed to Strapi.
 *   3. locale Strapi cache, even if it equals English. (Build-time fan-out:
 *      English copy that the fetch script writes so `ar.json` etc. are not
 *      sparse. We treat it as "no real translation" and only use it as
 *      last resort.)
 *   4. en Strapi cache.
 *   5. en local fallback.
 *
 * (1) wins over (2) so admin overrides in Strapi are always respected,
 * even if a contextual value was hand-shipped. (2) wins over (3) so
 * users on partially translated locales see a real translation instead
 * of English when the contextual one exists.
 */
export async function loadDict(locale: Locale): Promise<TranslationDict> {
  const enFallback = getLocalFallbackDict(DEFAULT_LOCALE);
  if (locale === DEFAULT_LOCALE) {
    const enFile = await loadLocaleFile(DEFAULT_LOCALE);
    return { ...enFallback, ...enFile };
  }
  const [localeFile, enFile, localeFallback] = await Promise.all([
    loadLocaleFile(locale),
    loadLocaleFile(DEFAULT_LOCALE),
    Promise.resolve(getLocalFallbackDict(locale)),
  ]);

  const out: TranslationDict = {};
  const allKeys = new Set<string>([
    ...Object.keys(enFallback),
    ...Object.keys(enFile),
    ...Object.keys(localeFallback),
    ...Object.keys(localeFile),
  ]);
  for (const key of allKeys) {
    const localeStrapi = localeFile[key];
    const enStrapi = enFile[key];
    const localeFb = localeFallback[key];
    const enFb = enFallback[key];

    // (1) Real Strapi-locale translation: present AND distinct from English.
    if (localeStrapi && localeStrapi !== enStrapi) {
      out[key] = localeStrapi;
      continue;
    }
    // (2) Contextual hand-translated fallback for this locale.
    if (localeFb) {
      out[key] = localeFb;
      continue;
    }
    // (3) Strapi fan-out (English copy in the locale file).
    if (localeStrapi) {
      out[key] = localeStrapi;
      continue;
    }
    // (4) Strapi en.
    if (enStrapi) {
      out[key] = enStrapi;
      continue;
    }
    // (5) Local en fallback.
    if (enFb) out[key] = enFb;
  }
  return out;
}

const BASIC_NAMESPACES = [
  'HEADER',
  'FOOTER',
  'COOKIE',
  'WARNINGS',
  'CONTACT_US',
  'SUBSCRIPTION',
];

/**
 * Pull a subset of the dictionary by key prefix. `includeBasics` mirrors
 * `ctx.i18n(keys, true)` from the legacy spec.
 */
export function pickI18n(
  dict: TranslationDict,
  namespaces: readonly string[],
  includeBasics = true,
): TranslationDict {
  const out: TranslationDict = {};
  const effective = includeBasics ? [...namespaces, ...BASIC_NAMESPACES] : [...namespaces];
  for (const key of Object.keys(dict)) {
    if (effective.some((ns) => key === ns || key.startsWith(`${ns}.`))) {
      out[key] = dict[key]!;
    }
  }
  return out;
}

export { createT, tr } from './createT';
export { localeHref, mainSiteHref } from './hrefs';
export { STRAPI_LOCALE };
