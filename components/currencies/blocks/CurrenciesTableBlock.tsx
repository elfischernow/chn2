import { getCurrencies } from '@/lib/api/currencies';
import { applyListing } from '@/lib/currencies/listing';
import { pickI18n } from '@/lib/i18n';

import { CurrenciesTable } from '../CurrenciesTable';
import { Pagination } from '../Pagination';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

const TABLE_PER_PAGE = 10;

/**
 * `currency-flow.currencies-table` — embedded "exchange to ..." table
 * that ranks the top counter-coins. Reuses the listing's `CurrenciesTable`
 * for styling parity. Excludes the page's own coin from the list.
 *
 * Server-fetches (`getCurrencies`) and renders inline — no client fetch.
 *
 * Pagination: when the coin URL is `/currencies/[coin]/page/[N]`, the page
 * resolver passes `tablePage` as a prop; the block paginates only the
 * embedded list (the rest of the coin page is identical across pages).
 * This matches legacy semantics where `:coin/page/:n` advances through
 * the counter-coin table while keeping hero/FAQ/etc. stable.
 */
export async function CurrenciesTableBlock({
  block,
  page,
  dict,
  hrefBase,
  tablePage = 1,
}: BlockProps) {
  const all = await getCurrencies();
  const filtered = all.filter((c) => c.link !== page.link);
  const result = applyListing(filtered, {
    sort: 'rank',
    perPage: TABLE_PER_PAGE,
    page: tablePage,
  });

  const title = (block.title as string) || `Exchange ${page.name}`;
  const description = (block.description as string) ?? '';

  const tableDict = pickI18n(dict, ['CURRENCIES_TABLE', 'CURRENCIES_PAGINATION']);

  const startIndex = (result.page - 1) * result.perPage + 1;
  const basePath = `${hrefBase}/currencies/${page.link}`;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDesc}>{description}</p>}
      <CurrenciesTable
        rows={result.rows}
        startIndex={startIndex}
        dict={tableDict}
        hrefBase={hrefBase}
      />
      <Pagination
        current={result.page}
        total={result.totalPages}
        basePath={basePath}
        dict={tableDict}
      />
    </section>
  );
}
