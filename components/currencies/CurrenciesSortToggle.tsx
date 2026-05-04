import { createT, type TranslationDict } from '@/lib/i18n/createT';
import type { ListingSort } from '@/lib/currencies/listing';

import styles from './currencies.module.css';

interface Props {
  current: ListingSort;
  /** Base path (without ?). The component appends sort + preserves query. */
  basePath: string;
  preserve?: Record<string, string>;
  dict: TranslationDict;
}

function buildHref(basePath: string, sort: ListingSort, preserve?: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(preserve ?? {})) {
    if (v) sp.set(k, v);
  }
  if (sort === 'abc') sp.set('sort', 'abc');
  // 'rank' is the default — drop the param to keep canonical URLs clean.
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Two-pill segmented control rendered as `<a>` elements so the toggle
 * works without JS. Each link encodes the resulting URL state directly.
 */
export function CurrenciesSortToggle({ current, basePath, preserve, dict }: Props) {
  const t = createT(dict);
  return (
    <div className={styles.sortToggle} role="group" aria-label="Sort">
      <a
        href={buildHref(basePath, 'rank', preserve)}
        className={`${styles.sortLink} ${current === 'rank' ? styles.sortLinkActive : ''}`}
        aria-current={current === 'rank' ? 'true' : undefined}
      >
        {t('CURRENCIES_TABLE.SORT_RANK')}
      </a>
      <a
        href={buildHref(basePath, 'abc', preserve)}
        className={`${styles.sortLink} ${current === 'abc' ? styles.sortLinkActive : ''}`}
        aria-current={current === 'abc' ? 'true' : undefined}
      >
        {t('CURRENCIES_TABLE.SORT_ABC')}
      </a>
    </div>
  );
}
