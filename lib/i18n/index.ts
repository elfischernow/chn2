import 'server-only';

import { unstable_cache } from 'next/cache';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CACHE_LONG, DEFAULT_LOCALE, type Locale, STRAPI_LOCALE } from '../config';

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
 * Load a full translation dictionary for a locale. In practice most pages
 * only need a slice of it — use `pickI18n` to reduce payload before
 * passing into client components.
 */
export async function loadDict(locale: Locale): Promise<TranslationDict> {
  if (locale === DEFAULT_LOCALE) return loadLocaleFile(DEFAULT_LOCALE);
  const [base, fallback] = await Promise.all([
    loadLocaleFile(locale),
    loadLocaleFile(DEFAULT_LOCALE),
  ]);
  return { ...fallback, ...base };
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

export { createT } from './createT';
export { STRAPI_LOCALE };
