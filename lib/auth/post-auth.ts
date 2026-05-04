// Post-auth redirect resolver — server-side half. Picks a target URL after
// successful auth based on:
//   1. `?next=<path>` query param, validated against NEXT_PARAM_ALLOWLIST.
//   2. Default → DEFAULT_REDIRECT_PATH (`/pro/balance`, per product).
//
// Two more sources are *client-only* (sessionStorage flags, predictions
// context) — they belong in lib/auth/post-auth.client.ts and run in the
// browser right before the redirect. The server-side resolver here is what
// the auth-gate layout uses when an already-authenticated user opens
// /authorization or /registration.

import {
  CRYPTO_LOAN_PATH,
  DEFAULT_REDIRECT_PATH,
  EXCHANGE_REDIRECT_PATH,
  NEXT_PARAM_ALLOWLIST,
} from './constants';

export interface ResolveTargetOptions {
  /**
   * Search params from the auth page request. Can be `URLSearchParams` or a
   * plain object — Next 16 server pages get `searchParams` as a Promise of
   * an object.
   */
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
  /**
   * Locale prefix (e.g. `'/ru'`, or `''` for the default locale). When
   * present, prepended to the resolved path.
   */
  localePrefix?: string;
  /**
   * Pathname of the page that initiated the auth flow. When `/crypto-loan`,
   * legacy reloads instead of redirecting. The server resolver returns the
   * special token `'@reload'` — caller decides what to do (`router.refresh`
   * on the client; reload-current-URL on the server).
   */
  fromPathname?: string;
  /**
   * `?proExchangeMode=true` flag from the original URL. Forwarded ONLY when
   * target ends up being `/pro/exchange` (legacy attached it everywhere —
   * see edge case E12 in docs/auth-migration-plan.md).
   */
  proExchangeMode?: boolean;
}

const RELOAD = '@reload' as const;
export type ResolvedTarget = string | typeof RELOAD;

const readNext = (
  searchParams: ResolveTargetOptions['searchParams'],
): string | null => {
  if (!searchParams) return null;
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get('next')
      : (Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next) ??
        null;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // Reject anything that doesn't start with `/`. Prevents open-redirect to
  // `https://evil.com` even if it slipped past the regex below.
  if (!raw.startsWith('/')) return null;
  // Reject double-slash (`//evil.com`) which some clients allow as host.
  if (raw.startsWith('//')) return null;
  if (NEXT_PARAM_ALLOWLIST.some((re) => re.test(raw))) return raw;
  return null;
};

export const resolvePostAuthTarget = (opts: ResolveTargetOptions = {}): ResolvedTarget => {
  if (opts.fromPathname === CRYPTO_LOAN_PATH) return RELOAD;

  const next = readNext(opts.searchParams);
  let path = next ?? DEFAULT_REDIRECT_PATH;

  // Forward `?proExchangeMode=true` only when the target is /pro/exchange —
  // it's a hint to the swap-widget on that page and is meaningless elsewhere.
  // Fixes edge case E12.
  let qs = '';
  if (opts.proExchangeMode && path === EXCHANGE_REDIRECT_PATH) {
    qs = '?proExchangeMode=true';
  }

  const prefix = opts.localePrefix ?? '';
  return `${prefix}${path}${qs}`;
};

export const POST_AUTH_RELOAD = RELOAD;
