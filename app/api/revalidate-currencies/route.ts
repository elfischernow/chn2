import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * On-demand revalidation. Second-door companion to `/api/tick` for manual
 * "just released this coin in admin, refresh now" actions. Webhook from
 * Strapi is intentionally NOT used (Q11 in docs/currencies-migration.md):
 * Strapi often updates fields irrelevant to render and would spam this
 * endpoint. The cron polls with `updated_at_gt` instead.
 *
 * Only pre-approved tag patterns are honored so a leaked token can't be
 * used to invalidate arbitrary internals.
 */

export const dynamic = 'force-dynamic';

const REVALIDATE_TOKEN = process.env.REVALIDATE_TOKEN;

const ALLOWED_TAGS = new Set([
  'currencies',
  'pair-whitelist',
  'url-registry',
  'exceptions',
  'redirects',
  'top-currencies',
]);

const ALLOWED_PREFIXES = ['coin:', 'pair:'];

function isAllowed(tag: string): boolean {
  if (ALLOWED_TAGS.has(tag)) return true;
  return ALLOWED_PREFIXES.some((p) => tag.startsWith(p) && tag.length > p.length);
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!REVALIDATE_TOKEN) {
    return NextResponse.json(
      { error: 'REVALIDATE_TOKEN not configured' },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  if (url.searchParams.get('token') !== REVALIDATE_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const tag = url.searchParams.get('tag') ?? '';
  if (!isAllowed(tag)) {
    return NextResponse.json({ error: `tag not allowed: ${tag}` }, { status: 400 });
  }
  // Next 16 requires a cache profile alongside the tag. 'default' picks
  // up whichever lifetime the tagged fetch was originally configured with.
  revalidateTag(tag, 'default');
  return NextResponse.json({ ok: true, revalidated: tag });
}

export async function GET(req: Request): Promise<NextResponse> {
  return POST(req);
}
