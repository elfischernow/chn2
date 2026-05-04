import {
  ENTRIES_PER_SITEMAP,
  chunkCount,
  escapeXml,
  getLiveEntries,
} from '@/lib/api/sitemap-builder';
import { SITE_URL } from '@/lib/config';

/**
 * `/sitemap.xml` — sitemap-index. Lists `/sitemap/0.xml`, `/sitemap/1.xml`,
 * etc. The chunk count derives from the number of live entries in the URL
 * Registry — same logic as `app/sitemap/[id]/route.ts` consumes, so the
 * index and chunks stay in sync by construction.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const entries = await getLiveEntries();
  const total = chunkCount(entries.length);
  const lastmod = newestLastmod(entries);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (let i = 0; i < total; i++) {
    parts.push('<sitemap>');
    parts.push(`<loc>${escapeXml(`${SITE_URL}/sitemaps/${i}.xml`)}</loc>`);
    parts.push(`<lastmod>${escapeXml(lastmod)}</lastmod>`);
    parts.push('</sitemap>');
  }
  parts.push('</sitemapindex>');

  return new Response(parts.join(''), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}

function newestLastmod(entries: { updatedAt: string }[]): string {
  if (entries.length === 0) return new Date().toISOString();
  let best = entries[0]!.updatedAt;
  for (const e of entries) if (e.updatedAt > best) best = e.updatedAt;
  return best;
}

// Silence the "unused" warning for the constant if we ever stop importing.
void ENTRIES_PER_SITEMAP;
