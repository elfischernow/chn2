#!/usr/bin/env node
// Pulls /currencies/light from the content API and writes a slim copy to
// lib/server/snapshots/currencies.json. This is the last-resort fallback
// when both Redis and Strapi are unavailable at runtime.
//
// Run from CI on every deploy:
//   node scripts/snapshot-currencies.mjs
//
// Mirrors the runtime normalization in lib/api/currencies.ts so the file
// shape matches Currency[] one-for-one. If the runtime shape changes,
// keep this script in sync.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'lib', 'server', 'snapshots', 'currencies.json');
const RAW_BASE = process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';
const BASE = RAW_BASE.replace(/\/$/, '');

const str = (v) => (typeof v === 'string' ? v : '');
const bool = (v) => v === true;
const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

function normalize(raw) {
  const currentTicker = str(raw.current_ticker).toLowerCase();
  const ticker = str(raw.ticker).toLowerCase();
  const network = str(raw.network).toLowerCase();
  if (!currentTicker || !ticker) return null;
  if (bool(raw.is_unavailable_payin) && bool(raw.is_unavailable_payout)) return null;

  const iconPath = raw.icon && typeof raw.icon === 'object' ? str(raw.icon.url) : '';
  const iconUrl = iconPath
    ? iconPath.startsWith('http')
      ? iconPath
      : `${BASE}${iconPath.startsWith('/') ? '' : '/'}${iconPath}`
    : null;

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    currentTicker,
    ticker,
    name: str(raw.name),
    network,
    link: str(raw.link),
    iconUrl,
    isFiat: bool(raw.is_fiat),
    isPopular: bool(raw.is_popular),
    isStable: bool(raw.is_stable),
    isDefi: bool(raw.is_defi),
    isPopularFiat: bool(raw.is_popular_fiat),
    isFixedRateEnabled: bool(raw.is_fixed_rate_enabled),
    position: num(raw.position),
    hasExternalId: bool(raw.has_external_id),
    externalIdName: raw.external_id_name ? str(raw.external_id_name) : null,
    isPage: bool(raw.is_page),
    isUnpopular: bool(raw.is_unpopular),
    redirectToId:
      typeof raw.redirect_to === 'number' && raw.redirect_to > 0 ? raw.redirect_to : null,
    hasExceptions: Array.isArray(raw.exceptions_list) && raw.exceptions_list.length > 0,
  };
}

async function main() {
  const url = `${BASE}/currencies/light`;
  console.log(`[snapshot] fetching ${url}`);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error('content-api did not return an array');

  const out = [];
  for (const row of raw) {
    if (bool(row.is_delisted)) continue;
    if (str(row.network).toLowerCase() === 'maticmainnet') continue;
    const c = normalize(row);
    if (c) out.push(c);
  }

  out.sort((a, b) => {
    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
    if (a.isPopularFiat !== b.isPopularFiat) return a.isPopularFiat ? -1 : 1;
    return a.position - b.position;
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out), 'utf8');
  console.log(`[snapshot] wrote ${out.length} currencies → ${OUT}`);
}

main().catch((err) => {
  console.error('[snapshot] failed:', err);
  // Soft-fail in CI: deploy proceeds with previous snapshot. The build is
  // not blocked because content-api hiccups shouldn't gate releases.
  process.exit(0);
});
