import { createT, type TranslationDict } from '@/lib/i18n/createT';

import styles from './currencies.module.css';

interface Props {
  /** Form action URL — the page itself; submit re-renders with new ?q=. */
  action: string;
  initialValue: string;
  dict: TranslationDict;
  /** Hidden inputs to preserve along with the search query (e.g. sort). */
  preserve?: Record<string, string>;
}

/**
 * Server-rendered search input. Plain `<form method="GET">` so JS-off
 * users get full functionality. A client-side debounced enhancement
 * lives in `CurrenciesSearchClient` (added in a follow-up chunk) and
 * progressively replaces this when JS is available.
 */
export function CurrenciesSearch({ action, initialValue, dict, preserve }: Props) {
  const t = createT(dict);
  return (
    <form action={action} method="get" role="search" className={styles.search}>
      <input
        type="search"
        name="q"
        defaultValue={initialValue}
        placeholder={t('CURRENCIES_TABLE.SEARCH_PLACEHOLDER')}
        className={styles.searchInput}
        autoComplete="off"
        aria-label={t('CURRENCIES_TABLE.SEARCH_PLACEHOLDER')}
      />
      {preserve &&
        Object.entries(preserve).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
    </form>
  );
}
