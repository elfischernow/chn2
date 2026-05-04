import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, type Locale } from '@/lib/config';

import { CONTENT_BASE, strapiFetch } from './client';

/**
 * Latest blog posts filtered by currency. Used by the `latest-news` block
 * on coin pages. The Strapi blog filter goes through the `currencies.link`
 * relation (each post can list one or more associated currencies).
 */

export interface BlogPostPreview {
  id: number;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  publishedAt: string;
  /** Display name of the post's author. `null` when the upstream omits it. */
  author: string | null;
}

interface BlogPostRaw {
  id?: number;
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  meta_description?: unknown;
  publication_date?: unknown;
  publishedAt?: unknown;
  published_at?: unknown;
  preview_image?: { url?: unknown } | null;
  preview_image_old?: { url?: unknown } | null;
  author?: { name?: unknown; full_name?: unknown } | null;
}

const limit = 5;

export async function getLatestNewsForCoin(
  link: string,
  locale: Locale = 'en' as Locale,
): Promise<BlogPostPreview[]> {
  const slug = link.toLowerCase();
  if (!slug) return [];
  return loadPosts(slug, locale);
}

const loadPosts = unstable_cache(
  async (link: string, locale: Locale): Promise<BlogPostPreview[]> => {
    let rows: BlogPostRaw[];
    try {
      rows = await strapiFetch<BlogPostRaw[]>('/blog-posts', {
        locale,
        limit,
        sort: 'publication_date:desc',
        where: { 'currencies.link': link },
        revalidate: CACHE_MEDIUM,
        tags: ['blog-posts', `blog-posts:coin:${link}`],
      });
    } catch {
      return [];
    }
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r): BlogPostPreview | null => {
        const title = typeof r.title === 'string' ? r.title : '';
        const slug = typeof r.slug === 'string' ? r.slug : '';
        if (!title || !slug) return null;
        const description =
          typeof r.meta_description === 'string'
            ? r.meta_description
            : typeof r.description === 'string'
              ? r.description
              : '';
        const imgPath =
          (r.preview_image && typeof r.preview_image === 'object' && typeof r.preview_image.url === 'string'
            ? r.preview_image.url
            : '') ||
          (r.preview_image_old && typeof r.preview_image_old === 'object' && typeof r.preview_image_old.url === 'string'
            ? r.preview_image_old.url
            : '');
        const image = imgPath
          ? imgPath.startsWith('http')
            ? imgPath
            : `${CONTENT_BASE}${imgPath.startsWith('/') ? '' : '/'}${imgPath}`
          : null;
        const date =
          (typeof r.publication_date === 'string' && r.publication_date) ||
          (typeof r.publishedAt === 'string' && r.publishedAt) ||
          (typeof r.published_at === 'string' && r.published_at) ||
          new Date().toISOString();
        const author =
          (r.author && typeof r.author === 'object' &&
            (typeof r.author.full_name === 'string'
              ? r.author.full_name
              : typeof r.author.name === 'string'
                ? r.author.name
                : null)) ||
          null;
        return {
          id: typeof r.id === 'number' ? r.id : 0,
          title,
          slug,
          description: description.slice(0, 200),
          image,
          publishedAt: date,
          author,
        };
      })
      .filter((p): p is BlogPostPreview => p !== null);
  },
  ['blog-posts-by-coin-v1'],
  { revalidate: CACHE_MEDIUM, tags: ['blog-posts'] },
);
