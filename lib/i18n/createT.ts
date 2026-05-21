// Shared `t()` factory — usable from both server and client. Mirrors the PUG
// helper from the legacy spec: returns the value when present, otherwise the
// supplied fallback, otherwise empty string (or the key itself in DEBUG mode).

const DEBUG =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_LOG_LEVEL === 'DEBUG';

export type TranslationDict = Record<string, string>;

export type TFunction = ReturnType<typeof createT>;

/**
 * One-shot translator. Same lookup rules as `createT`'s returned function,
 * but inline — no closure, no factory. Useful for ad-hoc lookups where you
 * don't want to thread a `t` through props, e.g. resolving a single Strapi
 * key inside a `useMemo` or a server component that already has the dict.
 */
export function tr(
  dict: TranslationDict | null | undefined,
  key: string,
  fallback?: string,
): string {
  const value = dict?.[key];
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback ?? (DEBUG ? key : '');
}

export function createT(dict: TranslationDict | null | undefined) {
  return function t(
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>,
  ): string {
    let fallback: string | undefined;
    let interpolation: Record<string, string | number> | undefined;

    if (typeof fallbackOrParams === 'string') {
      fallback = fallbackOrParams;
      interpolation = params;
    } else {
      interpolation = fallbackOrParams;
    }

    let value = dict?.[key];
    if (typeof value !== 'string' || value.length === 0) {
      value = fallback ?? (DEBUG ? key : '');
    }

    if (interpolation) {
      for (const [k, v] of Object.entries(interpolation)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  };
}
