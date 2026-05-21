export const CONTENT_API_BASEURL =
  process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';

export const SITE_URL = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_CN_SITE_URL ??
  'https://changenow.io'
).replace(/\/$/, '');

/**
 * Absolute base for ChangeNOW-internal links that this Next.js app does NOT
 * serve itself (e.g. `/pro/balance`, `/exchange/txs/:id`, `/affiliate`,
 * `/blog/:slug`). Used everywhere we render an `<a href>` or a
 * `window.location.assign` that points at a path still owned by the legacy
 * SPA / sibling deployment.
 *
 * Behaviour:
 *   - `NEXT_PUBLIC_CN_SITE_URL=https://front.bento.capital` → links resolve
 *     as absolute URLs to that host (cross-deploy CN cluster).
 *   - Unset (the default) → empty string, so `${CN_SITE_URL}/foo` is `/foo`
 *     — a relative URL the browser resolves against the current origin.
 *     Lets a dev visiting `localhost:3000` stay on localhost; a stage
 *     visiting `front.bento.capital` stays there; etc.
 *
 * Kept separate from `SITE_URL` so SEO surfaces (canonical URLs, OG tags,
 * sitemap, JSON-LD) — which require an absolute URL at SSR time — can keep
 * their existing fallback chain. Use `SITE_URL` when you need an absolute
 * value; use `CN_SITE_URL` for any in-product link.
 */
export const CN_SITE_URL = (process.env.NEXT_PUBLIC_CN_SITE_URL ?? '')
  .replace(/\/$/, '');

/**
 * Dev-only flag that swaps every auth-DAL call to local mock route handlers
 * (and unlocks the `/__dev/auth` cookie-state switcher page). Off by default,
 * so production / staging builds never ship the mocks.
 *
 * Build with `NEXT_PUBLIC_AUTH_MOCKS=true npm run dev` to enable.
 */
export const AUTH_MOCKS_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_MOCKS === 'true' ||
  process.env.NEXT_PUBLIC_AUTH_MOCKS === '1';

/**
 * Base URL the auth DAL talks to. Same-origin `/api/__mock` when the mock
 * flag is on (no CORS, no upstream needed for local UX testing); the real
 * vip-api otherwise. Trailing slashes stripped to keep `${base}/${path}`
 * concatenation honest.
 */
export const AUTH_API_BASE = AUTH_MOCKS_ENABLED
  ? '/api/__mock'
  : (
    process.env.NEXT_PUBLIC_VIP_API_BASE ?? 'https://vip-api.bento.capital'
  ).replace(/\/$/, '');

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
//
// When `NEXT_PUBLIC_AUTH_MOCKS` is on we redirect this to `/api/__mock` too
// so estimate, cashback, and transactions calls hit local route handlers
// instead of staging vip-api — same trick `AUTH_API_BASE` already pulls.
export const VIP_API_BASE = AUTH_MOCKS_ENABLED
  ? '/api/__mock'
  : (
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
