import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/config';

/**
 * `robots.txt`. The default policy is open — everything indexable except
 * paginated coin/pair pages past the cutoff (handled per-page via the
 * robots metadata, not here). Pagination on the listing isn't included
 * in the sitemap (matches legacy + Q6).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
