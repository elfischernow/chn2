// In-app fallback dictionary loader. Reads `lib/i18n/fallback.json` (per-key,
// per-locale shape) and exposes flat `Record<key, string>` views per locale.
//
// Purpose: ship UI strings that aren't yet in Strapi WITH contextual
// translations into every supported locale. At runtime, this dict sits
// BELOW the Strapi-cached disk file in lookup precedence — Strapi wins
// whenever it has the key, so removing an entry here is safe once it's
// been added to admin.
//
// The JSON ships as a build-time import (no I/O at request time), so this
// is cheap to call from both server components and client components.

import type { Locale } from '../config';

import fallbackRaw from './fallback.json' with { type: 'json' };

type RawEntry = Partial<Record<Locale, string>>;
type RawShape = Record<string, RawEntry | string>;

// Build a per-locale flattened dict once at module init. The JSON has a
// reserved `_comment` key (string) — filtered out below.
const FALLBACK = fallbackRaw as RawShape;

const memo = new Map<Locale, Record<string, string>>();

export function getLocalFallbackDict(locale: Locale): Record<string, string> {
  const cached = memo.get(locale);
  if (cached) return cached;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(FALLBACK)) {
    if (key.startsWith('_')) continue; // meta / comments
    if (!value || typeof value === 'string') continue;
    const text = value[locale];
    if (typeof text === 'string' && text.length > 0) out[key] = text;
  }
  memo.set(locale, out);
  return out;
}

/**
 * All keys present in the fallback file (debug / tooling). Useful for
 * spotting "still missing from Strapi" candidates from a one-liner.
 */
export function listFallbackKeys(): string[] {
  return Object.keys(FALLBACK).filter((k) => !k.startsWith('_'));
}
