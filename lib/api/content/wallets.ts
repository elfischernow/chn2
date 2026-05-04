import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, type Locale } from '@/lib/config';

import { CONTENT_BASE, strapiFetch } from './client';

/**
 * Wallet entries served by `/wallets` (Strapi). The endpoint is large per-row
 * (~250 KB / 2 records during probing) — never request without a filter.
 * We always pass `network=<code>` and a small limit per Q1.
 */

export interface Wallet {
  id: number;
  name: string;
  link: string | null;
  isRecommended: boolean;
  isComingSoon: boolean;
  position: number;
  color: string | null;
  logoUrl: string | null;
}

interface WalletRaw {
  id?: number;
  name?: unknown;
  link?: unknown;
  is_recommended?: unknown;
  is_coming_soon?: unknown;
  position?: unknown;
  color?: unknown;
  logo?: { url?: unknown } | null;
}

export async function getWalletsForNetwork(
  network: string,
  locale: Locale = 'en' as Locale,
): Promise<Wallet[]> {
  const net = network.toLowerCase();
  if (!net) return [];
  return loadWallets(net, locale);
}

const loadWallets = unstable_cache(
  async (network: string, locale: Locale): Promise<Wallet[]> => {
    let rows: WalletRaw[];
    try {
      rows = await strapiFetch<WalletRaw[]>('/wallets', {
        locale,
        limit: 30,
        sort: 'position:asc',
        where: { network },
        revalidate: CACHE_MEDIUM,
        tags: ['wallets', `wallets:${network}`],
      });
    } catch {
      return [];
    }
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r): Wallet => {
        const logoPath =
          r.logo && typeof r.logo === 'object' && typeof r.logo.url === 'string'
            ? r.logo.url
            : '';
        const logoUrl = logoPath
          ? logoPath.startsWith('http')
            ? logoPath
            : `${CONTENT_BASE}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`
          : null;
        return {
          id: typeof r.id === 'number' ? r.id : 0,
          name: typeof r.name === 'string' ? r.name : '',
          link: typeof r.link === 'string' && r.link ? r.link : null,
          isRecommended: r.is_recommended === true,
          isComingSoon: r.is_coming_soon === true,
          position:
            typeof r.position === 'number' ? r.position : Number(r.position) || 0,
          color: typeof r.color === 'string' ? r.color : null,
          logoUrl,
        };
      })
      .filter((w) => w.name);
  },
  ['wallets-by-network-v1'],
  { revalidate: CACHE_MEDIUM, tags: ['wallets'] },
);
