export const CONTENT_API_BASEURL =
  process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';

export const SITE_URL = (process.env.SITE_URL ?? 'https://changenow.io').replace(/\/$/, '');

// API cache TTLs (seconds). Match changenow-blog naming so values are
// portable across services.
export const API_CACHE_TTL = Number(process.env.API_CACHE_TTL ?? 3600);
export const CACHE_SHORT = Number(process.env.CACHE_SHORT ?? 60); // 1 min — listings, live rates
export const CACHE_MEDIUM = Number(process.env.CACHE_MEDIUM ?? 3600); // 1 h — categories, authors
export const CACHE_LONG = Number(process.env.CACHE_LONG ?? 604800); // 1 week — articles, i18n

export const LOCALES = [
  'en',
  'ru',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ar',
  'fa',
  'ja',
  'ko',
  'th',
  'tr',
  'vi',
  'zh',
  'ind',
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const RTL_LOCALES = new Set<Locale>(['ar', 'fa']);

export const STRAPI_LOCALE: Record<Locale, string> = {
  en: 'en',
  ru: 'ru',
  fr: 'fr',
  es: 'es',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ar: 'ar',
  fa: 'fa',
  ja: 'ja',
  ko: 'ko',
  th: 'th',
  tr: 'tr',
  vi: 'vi',
  zh: 'zh',
  ind: 'id',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
  fa: 'فارسی',
  ja: '日本語',
  ko: '한국어',
  th: 'ไทย',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  zh: '中文',
  ind: 'Bahasa Indonesia',
};
