'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { createT, type TranslationDict } from './createT';

const LocalizationContext = createContext<TranslationDict | null>(null);

export function LocalizationProvider({
  value,
  children,
}: {
  value: TranslationDict;
  children: ReactNode;
}) {
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useDict(): TranslationDict {
  return useContext(LocalizationContext) ?? {};
}

export function useI18n() {
  const dict = useContext(LocalizationContext);
  return useMemo(() => createT(dict), [dict]);
}

// Recursive shape of the intermediate tree we build before collapsing
// numeric-keyed objects into arrays. The dict ships flat `string` values, so
// the leaves are strings; everything above is a node.
type I18nNode = string | { [key: string]: I18nNode };

/**
 * Flatten dotted i18n keys into a tree, then convert numeric-keyed objects
 * into arrays. Useful for FAQ-style structured copy.
 */
export function useArrayFromFlatI18n(namespace: string): unknown[] {
  const dict = useContext(LocalizationContext);
  return useMemo(() => {
    if (!dict) return [];
    const prefix = namespace.endsWith('.') ? namespace : `${namespace}.`;
    const tree: { [key: string]: I18nNode } = {};
    for (const [key, value] of Object.entries(dict)) {
      if (!key.startsWith(prefix)) continue;
      const path = key.slice(prefix.length).split('.');
      let node: { [key: string]: I18nNode } = tree;
      for (let i = 0; i < path.length - 1; i++) {
        const seg = path[i]!;
        const existing = node[seg];
        if (existing == null || typeof existing === 'string') {
          const next: { [key: string]: I18nNode } = {};
          node[seg] = next;
          node = next;
        } else {
          node = existing;
        }
      }
      node[path[path.length - 1]!] = value;
    }
    const toArray = (obj: I18nNode): unknown => {
      if (obj == null || typeof obj !== 'object') return obj;
      const keys = Object.keys(obj);
      if (keys.length === 0) return obj;
      if (keys.every((k) => /^\d+$/.test(k))) {
        const arr: unknown[] = [];
        for (const k of keys.sort((a, b) => Number(a) - Number(b)))
          arr[Number(k)] = toArray(obj[k]!);
        return arr;
      }
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = toArray(obj[k]!);
      return out;
    };
    const r = toArray(tree);
    return Array.isArray(r) ? r : [];
  }, [dict, namespace]);
}
