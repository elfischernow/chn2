import 'server-only';

import { getRegistry, type PageType } from './url-registry';
import { DEFAULT_LOCALE, LOCALES, SITE_URL } from '@/lib/config';

/**
 * Sitemap building primitives. Centralises the live-entry slicing logic
 * shared by `app/sitemap.xml/route.ts` (index) and
 * `app/sitemap/[id]/route.ts` (chunks).
 */

export const ENTRIES_PER_SITEMAP = 50_000;

export interface LiveSitemapEntry {
  path: string;
  updatedAt: string;
  pageType: PageType;
}

export async function getLiveEntries(): Promise<LiveSitemapEntry[]> {
  const reg = await getRegistry();
  const out: LiveSitemapEntry[] = [];
  for (const [path, entry] of reg) {
    if (entry.status !== 'live') continue;
    out.push({ path, updatedAt: entry.updatedAt, pageType: entry.pageType });
  }
  out.sort((a, b) => {
    const tierA = tierOf(a.pageType);
    const tierB = tierOf(b.pageType);
    if (tierA !== tierB) return tierA - tierB;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });
  return out;
}

/**
 * Sitemap tier ordering. Listings (root pages) → single-coin pages →
 * pair pages. Buy pages mirror the same tiering one tier up so prod's
 * separate `sitemap-buy.xml.gz` slot stays roughly distinguishable
 * even while we fold both URL families into the same chunk stream.
 */
function tierOf(t: PageType | undefined): number {
  if (t === 'listing') return 0;
  if (t === 'coin') return 1;
  if (t === 'buy-coin') return 2;
  if (t === 'pair') return 3;
  return 4; // buy-pair
}

export function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / ENTRIES_PER_SITEMAP));
}

export function priorityFor(pageType: PageType): number {
  if (pageType === 'listing') return 1.0;
  if (pageType === 'coin') return 0.8;
  if (pageType === 'buy-coin') return 0.8;
  // pair / buy-pair both 0.7
  return 0.7;
}

/**
 * Render a urlset XML body for the given entries. Includes hreflang
 * alternates for all 16 locales + x-default, lastmod, priority.
 */
export function renderUrlset(entries: LiveSitemapEntry[]): string {
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );
  for (const e of entries) {
    parts.push('<url>');
    parts.push(`<loc>${escapeXml(`${SITE_URL}${e.path}`)}</loc>`);
    for (const l of LOCALES) {
      const prefix = l === DEFAULT_LOCALE ? '' : `/${l}`;
      parts.push(
        `<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(`${SITE_URL}${prefix}${e.path}`)}" />`,
      );
    }
    parts.push(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}${e.path}`)}" />`,
    );
    parts.push(`<lastmod>${escapeXml(e.updatedAt)}</lastmod>`);
    parts.push('<changefreq>weekly</changefreq>');
    parts.push(`<priority>${priorityFor(e.pageType).toFixed(1)}</priority>`);
    parts.push('</url>');
  }
  parts.push('</urlset>');
  return parts.join('');
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
