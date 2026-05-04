// Client-side complement to lib/auth/post-auth.ts. Reads sessionStorage
// flags that the swap widget / cashback tooltip / predictions card may have
// set BEFORE auth, then composes them with the server-resolvable signals
// (`?next`, default).
//
// Crucially, this helper reads-AND-removes atomically — legacy never cleared
// the flags, so a single login pinned every subsequent login to /pro/exchange
// for the rest of the tab session (edge case E1 in the migration plan).

import {
  DEFAULT_REDIRECT_PATH,
  EXCHANGE_REDIRECT_PATH,
  POST_AUTH_FLAGS,
  PREDICTIONS_REDIRECT_CONTEXT_KEY,
  PREDICTIONS_REDIRECT_PATH,
  REDIRECT_RULES,
  CRYPTO_LOAN_PATH,
  NEXT_PARAM_ALLOWLIST,
} from './constants';

export interface PredictionsRedirectContext {
  eventId: string;
  optionId?: string;
  outcomeIndex?: number;
}

export interface ResolveClientTargetOptions {
  /** Result of `resolvePostAuthTarget` from the server. We may override it. */
  serverTarget?: string;
  /** `?proExchangeMode=true` from the URL. */
  proExchangeMode?: boolean;
  /** Locale prefix (e.g. `'/ru'`, or `''`). */
  localePrefix?: string;
  /** Current pathname — used for the `/crypto-loan` reload special case. */
  fromPathname?: string;
}

const safeGetSessionStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // sessionStorage can throw under "block third-party cookies" privacy
    // settings even for first-party pages. Be quiet.
    return null;
  }
};

const safeRemoveSessionStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/** Read and atomically remove. Use ONLY when about to redirect. */
const consumeFlag = (key: string): string | null => {
  const value = safeGetSessionStorage(key);
  if (value !== null) safeRemoveSessionStorage(key);
  return value;
};

const consumePredictionsContext = (): PredictionsRedirectContext | null => {
  const raw = safeGetSessionStorage(PREDICTIONS_REDIRECT_CONTEXT_KEY);
  if (!raw) return null;
  // Always remove — even if parse fails, the flag is corrupt and we want it
  // gone so we don't trip on it next time.
  safeRemoveSessionStorage(PREDICTIONS_REDIRECT_CONTEXT_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.eventId === 'string') {
      return {
        eventId: parsed.eventId,
        optionId: typeof parsed.optionId === 'string' ? parsed.optionId : undefined,
        outcomeIndex:
          typeof parsed.outcomeIndex === 'number' ? parsed.outcomeIndex : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const buildPredictionsTarget = (ctx: PredictionsRedirectContext, prefix: string): string => {
  const params = new URLSearchParams();
  params.set('eventId', ctx.eventId);
  if (ctx.optionId) params.set('optionId', ctx.optionId);
  if (ctx.outcomeIndex !== undefined) {
    params.set('outcomeIndex', String(ctx.outcomeIndex));
  }
  return `${prefix}${PREDICTIONS_REDIRECT_PATH}?${params.toString()}`;
};

const RELOAD_TOKEN = '@reload' as const;
export type ClientResolvedTarget = string | typeof RELOAD_TOKEN;

/**
 * Compute the final URL to navigate to after a successful login/register.
 * Source priority (highest first):
 *   1. `?next` allow-listed path (already chosen on the server, passed in
 *      `serverTarget` if it's not the default).
 *   2. `predictions-redirect-context` sessionStorage entry → /pro/predictions.
 *   3. `isOpenFromFiatMode` / `isOpenFromCashbackTooltip` → /pro/exchange.
 *   4. `serverTarget` (= /pro/balance fallback OR `?next`).
 *
 * (2) and (3) consume their sessionStorage entries — call this exactly once
 * at redirect time.
 *
 * Special: when current page is `/crypto-loan`, returns `'@reload'`. The
 * caller decides whether to `router.refresh()` or `window.location.reload()`.
 */
export const resolveClientPostAuthTarget = (
  opts: ResolveClientTargetOptions = {},
): ClientResolvedTarget => {
  const prefix = opts.localePrefix ?? '';

  if (opts.fromPathname === CRYPTO_LOAN_PATH) return RELOAD_TOKEN;

  // (1) is already baked into `opts.serverTarget` (resolvePostAuthTarget on
  // the server picked it from `?next` if allowed). If `serverTarget` is set
  // to anything other than the default, treat it as user-specified intent
  // and respect it OVER sessionStorage flags.
  const serverTargetIsExplicit =
    !!opts.serverTarget &&
    !opts.serverTarget.endsWith(DEFAULT_REDIRECT_PATH) &&
    !opts.serverTarget.endsWith(`${DEFAULT_REDIRECT_PATH}?proExchangeMode=true`);

  if (serverTargetIsExplicit && opts.serverTarget) {
    // Still need to consume sessionStorage flags so they don't pollute the
    // next login — but we don't override the explicit `?next`.
    consumeFlag(POST_AUTH_FLAGS.OPEN_FROM_FIAT_MODE);
    consumeFlag(POST_AUTH_FLAGS.OPEN_FROM_CASHBACK_TOOLTIP);
    consumePredictionsContext();
    return opts.serverTarget;
  }

  // (2) Predictions context.
  const predictions = consumePredictionsContext();
  if (predictions) {
    // Also drain the other flags so the next login starts clean.
    consumeFlag(POST_AUTH_FLAGS.OPEN_FROM_FIAT_MODE);
    consumeFlag(POST_AUTH_FLAGS.OPEN_FROM_CASHBACK_TOOLTIP);
    return buildPredictionsTarget(predictions, prefix);
  }

  // (3) Fiat / cashback flags.
  let exchangeFromFlag = false;
  for (const rule of REDIRECT_RULES) {
    const value = consumeFlag(rule.flag);
    if (value === 'true' && rule.targetPath === EXCHANGE_REDIRECT_PATH) {
      exchangeFromFlag = true;
    }
  }
  if (exchangeFromFlag) {
    const qs = opts.proExchangeMode ? '?proExchangeMode=true' : '';
    return `${prefix}${EXCHANGE_REDIRECT_PATH}${qs}`;
  }

  // (4) Server fallback (default = /pro/balance, possibly with locale prefix).
  if (opts.serverTarget) return opts.serverTarget;
  return `${prefix}${DEFAULT_REDIRECT_PATH}`;
};

export const POST_AUTH_RELOAD: typeof RELOAD_TOKEN = RELOAD_TOKEN;

// ─── Helpers used by other parts of the app to set the flags ─────────────
// Extracted here so when callers stop using them (post-migration), this
// file is the only one to clean up.

export const setOpenFromFiatModeFlag = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(POST_AUTH_FLAGS.OPEN_FROM_FIAT_MODE, 'true');
  } catch {
    // ignore
  }
};

export const setOpenFromCashbackTooltipFlag = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(POST_AUTH_FLAGS.OPEN_FROM_CASHBACK_TOOLTIP, 'true');
  } catch {
    // ignore
  }
};

export const setPredictionsRedirectContext = (ctx: PredictionsRedirectContext): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      PREDICTIONS_REDIRECT_CONTEXT_KEY,
      JSON.stringify(ctx),
    );
  } catch {
    // ignore
  }
};

// Re-export for tests/use cases that need to validate paths against the
// allow-list outside of resolvePostAuthTarget.
export { NEXT_PARAM_ALLOWLIST };
