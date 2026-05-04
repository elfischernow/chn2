import { CONTENT_BASE } from './client';

/**
 * Resolve an icon path returned by Strapi into a fully-qualified URL.
 * Strapi sends image URLs as either an absolute URL (`https://…/uploads/btc.svg`)
 * or a path-relative one (`/uploads/btc.svg`); we normalize both shapes
 * so call-sites don't have to care.
 *
 * Returns `null` when the input is empty / nullish so the caller can fall
 * back to a placeholder.
 */
export function resolveStrapiIconUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${CONTENT_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`;
}
