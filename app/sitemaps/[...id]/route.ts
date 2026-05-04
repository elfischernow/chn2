import {
  ENTRIES_PER_SITEMAP,
  chunkCount,
  getLiveEntries,
  renderUrlset,
} from '@/lib/api/sitemap-builder';

/**
 * `/sitemap/[...id]` — chunked sitemap content. Catch-all rather than a
 * plain dynamic segment because Next's `[id]` matcher refuses to match
 * paths with a `.` (so `[id]` would never match `0.xml`). The catch-all
 * captures the literal value (e.g. `['0.xml']`), and we strip the suffix
 * so callers can pass `0` or `0.xml` interchangeably.
 *
 * Status codes returned via plain Response objects rather than
 * `notFound()`: route handlers stream their own response and `notFound()`
 * from next/navigation works inconsistently here.
 */

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string[] }>;
}

const NOT_FOUND = new Response('Not found', { status: 404 });

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  if (!Array.isArray(id) || id.length !== 1) return NOT_FOUND;
  const rawId = id[0]!;
  const idStr = rawId.replace(/\.xml$/, '');
  if (!/^\d+$/.test(idStr)) return NOT_FOUND;
  const chunkId = Number(idStr);

  const entries = await getLiveEntries();
  const total = chunkCount(entries.length);
  if (chunkId < 0 || chunkId >= total) return NOT_FOUND;

  const start = chunkId * ENTRIES_PER_SITEMAP;
  const slice = entries.slice(start, start + ENTRIES_PER_SITEMAP);
  const xml = renderUrlset(slice);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}
