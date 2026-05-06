export const CONTENT_API_BASEURL =
  process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';

export const SITE_URL = (process.env.SITE_URL ?? 'https://changenow.io').replace(/\/$/, '');

// Public vip-api host. Reached directly from the browser — no Next proxy
// in front. For the cookie-bound flows (signin, /users/me, /v1.1/transactions
// when authenticated) this works because the browser treats vip-api's
// cookies as first-party as long as the origin shares the same eTLD+1 with
// our app. Dev/preview environments map a sibling host (e.g. `vip-api.local`)
// in /etc/hosts so cookies stay first-party there too.
//
// `NEXT_PUBLIC_*` so it reaches the bundle. The default points at the same
// upstream the legacy SPA uses (vip-api.bento.capital), but production
// deployments override to the same eTLD+1 as the public site.
export const VIP_API_BASE = (
  process.env.NEXT_PUBLIC_VIP_API_BASE ?? 'https://vip-api.bento.capital'
).replace(/\/$/, '');

// Public content-api host. Same shape as VIP_API_BASE — needed in the bundle
// because the client's NOW→USD lookup (for the cashback upsell) hits it
// directly. The server-side `lib/api/currencies.ts` reads `CONTENT_API_BASEURL`
// without the NEXT_PUBLIC_ prefix; this value is the client-facing override.
export const CONTENT_API_PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_CONTENT_API_BASE ??
  process.env.CONTENT_API_BASEURL ??
  'https://content-api.changenow.io'
).replace(/\/$/, '');

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
