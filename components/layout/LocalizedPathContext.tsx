'use client';

/**
 * Shared context for announcing "this route has a localized equivalent at X".
 *
 * Populated by article pages (which know the post's `availableLocales`) via
 * the `<AnnounceLocalizedPath>` client effect, consumed by the
 * LanguageSwitcher in the header so it can:
 *   - link to the translated article when it exists
 *   - fall back to the locale's blog home when it doesn't (avoids 404s)
 *
 * The provider lives in the blog layout — above both the header (which
 * reads the state) and the page (which writes it). React context flows
 * down, so this is the only level where both parties meet.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Locale } from '@/lib/config';

export type LocalizedUrlMap = Partial<Record<Locale, string>>;

interface LocalizedPathValue {
  urlForLocale: LocalizedUrlMap;
  set(map: LocalizedUrlMap): void;
  clear(): void;
}

const LocalizedPathContext = createContext<LocalizedPathValue | null>(null);

export function LocalizedPathProvider({ children }: { children: ReactNode }) {
  const [urlForLocale, setUrlForLocale] = useState<LocalizedUrlMap>({});

  const value = useMemo<LocalizedPathValue>(
    () => ({
      urlForLocale,
      set: setUrlForLocale,
      clear: () => setUrlForLocale({}),
    }),
    [urlForLocale],
  );

  return (
    <LocalizedPathContext.Provider value={value}>{children}</LocalizedPathContext.Provider>
  );
}

/**
 * Read-only accessor for consumers (the language switcher).
 * Returns an empty map when no page has announced availability yet.
 */
export function useLocalizedPath(): LocalizedUrlMap {
  const ctx = useContext(LocalizedPathContext);
  return ctx?.urlForLocale ?? {};
}

/**
 * Render this as a child of any content page that wants the header's
 * language switcher to route to translated equivalents instead of dead
 * slugs. Clears the announcement on unmount so stale data from a previous
 * article doesn't leak into the next route.
 */
export function AnnounceLocalizedPath({ urlForLocale }: { urlForLocale: LocalizedUrlMap }) {
  const ctx = useContext(LocalizedPathContext);
  // Stabilize the dependency: JSON of a small (<20 keys) object is cheaper
  // than forcing every caller to memoize manually.
  const serialized = JSON.stringify(urlForLocale);

  const apply = useCallback(() => {
    if (ctx) ctx.set(urlForLocale);
  }, [ctx, serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apply();
    return () => {
      if (ctx) ctx.clear();
    };
  }, [apply, ctx]);

  return null;
}
