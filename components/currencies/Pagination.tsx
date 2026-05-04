import { createT, type TranslationDict } from '@/lib/i18n/createT';

import styles from './currencies.module.css';

interface Props {
  current: number;
  total: number;
  /** Base path *without* `/page/N` — pagination URL is composed below. */
  basePath: string;
  preserve?: Record<string, string>;
  dict: TranslationDict;
}

function pageHref(
  basePath: string,
  page: number,
  preserve?: Record<string, string>,
): string {
  const path = page <= 1 ? basePath : `${basePath}/page/${page}`;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(preserve ?? {})) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Compact pagination strip. Always shows first, last, current ± 2 with
 * `…` for gaps. SEO links — every page reachable from `/currencies` so
 * crawlers don't need JS.
 */
export function Pagination({ current, total, basePath, preserve, dict }: Props) {
  if (total <= 1) return null;
  const t = createT(dict);

  const pages = pageWindow(current, total);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <a
        className={styles.pageLink}
        aria-disabled={current <= 1}
        href={current <= 1 ? '#' : pageHref(basePath, current - 1, preserve)}
        rel="prev"
      >
        {t('CURRENCIES_PAGINATION.PREV')}
      </a>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`gap-${i}`} className={styles.pageEllipsis} aria-hidden>
            …
          </span>
        ) : (
          <a
            key={p}
            className={`${styles.pageLink} ${p === current ? styles.pageLinkActive : ''}`}
            href={pageHref(basePath, p, preserve)}
            aria-current={p === current ? 'page' : undefined}
          >
            {p}
          </a>
        ),
      )}

      <a
        className={styles.pageLink}
        aria-disabled={current >= total}
        href={current >= total ? '#' : pageHref(basePath, current + 1, preserve)}
        rel="next"
      >
        {t('CURRENCIES_PAGINATION.NEXT')}
      </a>

      <span className={styles.pageHint}>
        {t('CURRENCIES_PAGINATION.PAGE_OF', { current, total })}
      </span>
    </nav>
  );
}

type Slot = number | 'ellipsis';

function pageWindow(current: number, total: number): Slot[] {
  // Show: 1 … (current-1) current (current+1) … total. Always include 1 and
  // total. Bound by total so we don't double-render edges.
  const out: Slot[] = [];
  const push = (v: Slot) => out.push(v);
  const want = new Set<number>([1, total, current - 1, current, current + 1, 2, total - 1]);
  let prev = 0;
  const sorted = Array.from(want)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  for (const n of sorted) {
    if (n === prev) continue;
    if (prev !== 0 && n - prev > 1) push('ellipsis');
    push(n);
    prev = n;
  }
  return out;
}
