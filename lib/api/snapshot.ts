import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Currency } from './currencies';

/**
 * Last-resort fallback for the currency catalog. Read from a JSON file
 * committed to the repo so a pod with neither Redis nor Strapi reachable
 * can still render structured pages instead of dying. See
 * docs/currencies-migration.md §4.3.1 / §4.7 for the resilience model.
 *
 * The file is regenerated on every deploy by `scripts/snapshot-currencies.mjs`.
 * Read once, cached in module scope — restart-only refresh is fine because
 * this is the *third* tier (Strapi → Redis → snapshot).
 */

const SNAPSHOT_PATH = join(process.cwd(), 'lib', 'server', 'snapshots', 'currencies.json');

let cached: Currency[] | null = null;

export function loadCurrenciesSnapshot(): Currency[] {
  if (cached) return cached;
  try {
    const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Array<Partial<Currency>>;
    if (!Array.isArray(parsed)) return [];
    // `isPage` was added after the initial snapshot ship — older files on
    // disk don't carry the flag. Default to `true` so a stale snapshot
    // keeps the legacy behaviour (every currency gets a page); fresh
    // snapshots from `scripts/snapshot-currencies.mjs` carry the real
    // upstream `is_page` and override this.
    cached = parsed.map((c) => ({
      id: 0,
      isPage: true,
      isUnpopular: false,
      redirectToId: null,
      hasExceptions: false,
      ...c,
    })) as Currency[];
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}
