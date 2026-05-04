import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, type Locale } from '@/lib/config';

import { CONTENT_BASE, strapiFetch } from './client';
import type { Block, CounterCurrency, PairPage, PairPageRaw, UpstreamCurrencyRef } from './types';

/**
 * Pair-page mirror of `getCoinPage`. Same caching scheme + tags, plus a
 * `pair:{from}-{to}` precision tag so admins can revalidate one pair
 * without nuking the broader catalog.
 */
export async function getPairPage(
  fromLink: string,
  toLink: string,
  locale: Locale,
): Promise<PairPage | null> {
  const f = fromLink.toLowerCase();
  const t = toLink.toLowerCase();
  return loadPairPage(f, t, locale);
}

const loadPairPage = unstable_cache(
  async (fromLink: string, toLink: string, locale: Locale): Promise<PairPage | null> => {
    let rows: PairPageRaw[];
    try {
      rows = await strapiFetch<PairPageRaw[]>('/currency-pair-pages', {
        locale,
        limit: 1,
        where: {
          'currency_from.link': fromLink,
          'currency_to.link': toLink,
        },
        revalidate: CACHE_MEDIUM,
        tags: ['currencies', `pair:${fromLink}-${toLink}`],
      });
    } catch {
      return null;
    }
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const raw = rows[0]!;
    if (!raw.currency_from?.link || !raw.currency_to?.link) return null;

    const from = raw.currency_from;
    const counter = currencyToCounter(raw.currency_to);

    return {
      id: raw.id,
      title: (raw.title ?? '').trim(),
      metaTitle: raw.meta_title?.trim() || null,
      metaDescription: raw.meta_description?.trim() || null,
      description: (raw.description ?? '').trim(),
      link: from.link!,
      ticker: (from.current_ticker ?? from.ticker ?? '').toLowerCase(),
      name: from.name ?? '',
      network: (from.network ?? '').toLowerCase(),
      iconUrl: iconUrlOf(from),
      blocks: filterBlocks(raw.blocks ?? []),
      updatedAt: raw.updated_at ?? new Date().toISOString(),
      counter,
    };
  },
  ['pair-page-v1'],
  { revalidate: CACHE_MEDIUM, tags: ['currencies'] },
);

function iconUrlOf(c: UpstreamCurrencyRef): string | null {
  const path = c.icon?.url ?? c.icon_png?.url ?? '';
  if (!path) return null;
  return path.startsWith('http')
    ? path
    : `${CONTENT_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function currencyToCounter(c: UpstreamCurrencyRef): CounterCurrency {
  return {
    link: c.link ?? '',
    ticker: (c.current_ticker ?? c.ticker ?? '').toLowerCase(),
    name: c.name ?? '',
    network: (c.network ?? '').toLowerCase(),
    iconUrl: iconUrlOf(c),
  };
}

function filterBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b && b.is_enabled !== false);
}
