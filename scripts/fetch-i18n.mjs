#!/usr/bin/env node
// Build-time i18n fetch — pulls translation keys from the content API and
// writes one JSON dictionary per locale into lib/server/i18n/.
// On network failure, leaves any existing dicts in place and exits clean so
// the build doesn't break.
//
// Local overrides: any keys present in `lib/server/i18n/_local/<locale>.json`
// are merged on top of what the API returned. Use this to ship UI strings
// for features that haven't been pushed to admin yet — once they land in
// Strapi, delete the local entry. The override is intentionally last-wins
// so a string can be shipped as `_local/en.json: { NEW.KEY: "..." }` and
// fan out to other locales via the en-fallback step below.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'lib', 'server', 'i18n');
const LOCAL_DIR = join(OUT_DIR, '_local');
const BASE_URL = process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';

const LOCALES = [
  'en', 'ru', 'fr', 'es', 'de', 'it', 'pt', 'ar', 'fa',
  'ja', 'ko', 'th', 'tr', 'vi', 'zh', 'ind',
];

function fileFor(loc) {
  return join(OUT_DIR, `${loc === 'ind' ? 'id' : loc}.json`);
}

async function main() {
  console.log(`[i18n] fetching translation keys from ${BASE_URL}`);
  const res = await fetch(`${BASE_URL}/translation-keys?_limit=-1`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const keys = await res.json();
  console.log(`[i18n] fetched ${keys.length} keys`);

  mkdirSync(OUT_DIR, { recursive: true });

  const buckets = Object.fromEntries(LOCALES.map((l) => [l, {}]));

  for (const row of keys) {
    const k = String(row.key);
    for (const loc of LOCALES) {
      const v = row[loc];
      if (typeof v === 'string' && v.length > 0) buckets[loc][k] = v;
    }
  }

  // Local overrides — applied BEFORE en-fallback so a key only present in
  // _local/en.json fans out to all locales as english.
  const localOverrides = readLocalOverrides();
  for (const [loc, overrides] of Object.entries(localOverrides)) {
    if (!buckets[loc]) continue;
    Object.assign(buckets[loc], overrides);
  }

  // Fill any missing translations from English so render never explodes.
  const en = buckets.en;
  for (const loc of LOCALES) {
    if (loc === 'en') continue;
    for (const [k, v] of Object.entries(en)) {
      if (!buckets[loc][k]) buckets[loc][k] = v;
    }
  }

  for (const loc of LOCALES) {
    writeFileSync(fileFor(loc), JSON.stringify(buckets[loc]));
    console.log(`[i18n] ${loc} — ${Object.keys(buckets[loc]).length} keys`);
  }
}

function readLocalOverrides() {
  const out = {};
  if (!existsSync(LOCAL_DIR)) return out;
  for (const file of readdirSync(LOCAL_DIR)) {
    if (!file.endsWith('.json')) continue;
    const loc = file.replace(/\.json$/, '');
    try {
      out[loc] = JSON.parse(readFileSync(join(LOCAL_DIR, file), 'utf8'));
      console.log(`[i18n] applied ${Object.keys(out[loc]).length} local overrides for ${loc}`);
    } catch (err) {
      console.warn(`[i18n] skipping malformed ${file}: ${err.message}`);
    }
  }
  return out;
}

main().catch((err) => {
  console.error('[i18n] failed:', err.message);
  // Write empty stubs only where missing so the build can proceed.
  mkdirSync(OUT_DIR, { recursive: true });
  for (const loc of LOCALES) {
    const path = fileFor(loc);
    if (!existsSync(path)) writeFileSync(path, '{}');
  }
  process.exitCode = 0;
});
