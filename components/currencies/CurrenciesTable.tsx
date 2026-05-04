import type { Currency } from '@/lib/api/currencies';
import { createT, type TranslationDict } from '@/lib/i18n/createT';

import { CurrenciesRow } from './CurrenciesRow';

import styles from './currencies.module.css';

interface Props {
  rows: Currency[];
  /** Index offset (page > 1 starts numbering at perPage * (page - 1) + 1). */
  startIndex: number;
  dict: TranslationDict;
  hrefBase: string;
}

/**
 * Server-rendered listing table. SSR-only; works with JS disabled. See
 * docs/currencies-migration.md §4.5 (block contract).
 */
export function CurrenciesTable({ rows, startIndex, dict, hrefBase }: Props) {
  const t = createT(dict);

  if (rows.length === 0) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t('CURRENCIES_TABLE.EMPTY_TITLE')}</h2>
          <p>{t('CURRENCIES_TABLE.EMPTY_HINT')}</p>
        </div>
      </div>
    );
  }

  const exchangeCta = t('CURRENCIES_TABLE.EXCHANGE_CTA');

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colIndex}>{t('CURRENCIES_TABLE.COL_INDEX')}</th>
            <th>{t('CURRENCIES_TABLE.COL_NAME')}</th>
            <th className={styles.colNetwork}>{t('CURRENCIES_TABLE.COL_NETWORK')}</th>
            <th className={styles.colAction} aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <CurrenciesRow
              key={`${c.link}-${c.ticker}`}
              currency={c}
              index={startIndex + i}
              exchangeCta={exchangeCta}
              hrefBase={hrefBase}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
