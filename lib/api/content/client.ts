import 'server-only';

/**
 * Strapi REST client. Mirrors the pattern used in `legacy-projects/changenow-blog/lib/api/strapi.ts`.
 *
 * The content API is a Strapi v3 install. Conventions worth knowing:
 *   - `_locale=<lang>` switches the localization branch.
 *   - `_limit`, `_start`, `_sort` paginate.
 *   - `_where[field_gte]=...` filters (used for incremental sync of the
 *     URL Registry by `updated_at`).
 *   - **Never pass `_limit=-1` to heavy collections** (currency-pages,
 *     wallets) — single rows are dozens of KB and unbounded fetches will
 *     overload the upstream. Always paginate. The build-time `/translation-keys`
 *     fetch is the one explicit exception (one-shot at deploy, not runtime).
 *
 * Caching: combines Next's built-in fetch cache (`next.revalidate + tags`)
 * for ISR/HMR with our own `getCached` wrapper layered on top in callers
 * — see `lib/cache/shared-cache.ts`. The combination gives us request
 * coalescing in-pod plus shared L2 across pods.
 */

const RAW_BASE = process.env.CONTENT_API_BASEURL ?? 'https://content-api.changenow.io';
export const CONTENT_BASE = RAW_BASE.replace(/\/$/, '');

export interface FetchOpts {
  /** App locale (e.g. 'en', 'ru'). Mapped to Strapi locale via STRAPI_LOCALE. */
  locale?: string;
  limit?: number;
  start?: number;
  /** Strapi sort string, e.g. 'updated_at:desc'. */
  sort?: string;
  /** Free-form filter pairs: { 'currency_from.link': 'btc' } */
  where?: Record<string, string | number | boolean>;
  /** Next.js cache TTL in seconds. */
  revalidate?: number;
  /** Next.js cache tags for `revalidateTag`. */
  tags?: string[];
}

/** App locale → Strapi locale code where they differ. */
const STRAPI_LOCALE: Record<string, string> = {
  ind: 'id',
};

function buildQuery(opts: FetchOpts): string {
  const sp = new URLSearchParams();
  if (opts.locale) sp.set('_locale', STRAPI_LOCALE[opts.locale] ?? opts.locale);
  if (opts.limit !== undefined) sp.set('_limit', String(opts.limit));
  if (opts.start !== undefined) sp.set('_start', String(opts.start));
  if (opts.sort) sp.set('_sort', opts.sort);
  for (const [k, v] of Object.entries(opts.where ?? {})) sp.set(k, String(v));
  return sp.toString();
}

export async function strapiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const qs = buildQuery(opts);
  const url = `${CONTENT_BASE}${path.startsWith('/') ? '' : '/'}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: {
      revalidate: opts.revalidate ?? 60,
      tags: opts.tags,
    },
  });

  if (!res.ok) {
    throw new Error(`strapi ${res.status} @ ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * Paginated fetch — repeatedly calls strapiFetch with increasing `_start`
 * until the upstream returns fewer rows than `pageSize`. Use for collections
 * where the total count is unknown but bounded (currency-pages, etc.).
 */
export async function strapiFetchAll<T>(
  path: string,
  opts: Omit<FetchOpts, 'limit' | 'start'> & { pageSize?: number; maxPages?: number } = {},
): Promise<T[]> {
  const pageSize = opts.pageSize ?? 200;
  const maxPages = opts.maxPages ?? 50; // 200 × 50 = 10k rows safety cap
  const out: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const batch = await strapiFetch<T[]>(path, {
      ...opts,
      limit: pageSize,
      start: page * pageSize,
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < pageSize) break;
  }
  return out;
}
