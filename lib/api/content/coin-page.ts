import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, type Locale } from '@/lib/config';

import { CONTENT_BASE, strapiFetch } from './client';
import type { Block, CoinPage, CoinPageRaw } from './types';

/**
 * Fetch one coin's content page from Strapi. Filters by `currency_from.link`
 * + locale. Returns null if the upstream has no record for this combo —
 * caller decides whether to fall back to a default-block render or 404.
 *
 * Cached per (link, locale) for 1 hour. Tags `currencies` (catalog-wide
 * invalidation), `coin:{link}` (precision invalidation when a single
 * page is edited in admin).
 */
export async function getCoinPage(link: string, locale: Locale): Promise<CoinPage | null> {
  const slug = link.toLowerCase();
  return loadCoinPage(slug, locale);
}

const loadCoinPage = unstable_cache(
  async (link: string, locale: Locale): Promise<CoinPage | null> => {
    let rows: CoinPageRaw[];
    try {
      rows = await strapiFetch<CoinPageRaw[]>('/currency-pages', {
        locale,
        limit: 1,
        where: { 'currency_from.link': link },
        // Pass-through the same cache settings to Next's fetch cache.
        revalidate: CACHE_MEDIUM,
        tags: ['currencies', `coin:${link}`],
      });
    } catch {
      return null;
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const raw = rows[0]!;
    const c = raw.currency_from;
    if (!c?.link) return null;

    const iconPath = c.icon?.url ?? c.icon_png?.url ?? '';
    const iconUrl = iconPath
      ? iconPath.startsWith('http')
        ? iconPath
        : `${CONTENT_BASE}${iconPath.startsWith('/') ? '' : '/'}${iconPath}`
      : null;

    return {
      id: raw.id,
      title: (raw.title ?? '').trim(),
      metaTitle: raw.meta_title?.trim() || null,
      metaDescription: raw.meta_description?.trim() || null,
      description: (raw.description ?? '').trim(),
      link: c.link,
      ticker: (c.current_ticker ?? c.ticker ?? '').toLowerCase(),
      name: c.name ?? '',
      network: (c.network ?? '').toLowerCase(),
      iconUrl,
      blocks: filterBlocks(raw.blocks ?? []),
      updatedAt: raw.updated_at ?? new Date().toISOString(),
    };
  },
  ['coin-page-v1'],
  { revalidate: CACHE_MEDIUM, tags: ['currencies'] },
);

/** Drop blocks the admin disabled. Order is preserved from the API. */
function filterBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b && b.is_enabled !== false);
}
