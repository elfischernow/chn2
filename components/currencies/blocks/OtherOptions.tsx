import { getCurrencies } from '@/lib/api/currencies';
import { applyListing } from '@/lib/currencies/listing';
import { pickI18n } from '@/lib/i18n';

import { CurrenciesTable } from '../CurrenciesTable';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.other-options` / `.other-options-to-buy` — pair pages'
 * "or swap with these instead" suggestion strip. Mirrors `CurrenciesTableBlock`
 * but ranks coins relative to the FROM coin, excluding both endpoints of
 * the current pair.
 */
export async function OtherOptions({ block, page, counter, dict, hrefBase }: BlockProps) {
  if (!counter) return null;
  const all = await getCurrencies();
  const filtered = all.filter((c) => c.link !== page.link && c.link !== counter.link);
  const result = applyListing(filtered, { sort: 'rank', perPage: 8, page: 1 });

  const title = (block.title as string) || `Other options to swap with ${page.name}`;
  const description = (block.description as string) ?? '';
  const tableDict = pickI18n(dict, ['CURRENCIES_TABLE']);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDesc}>{description}</p>}
      <CurrenciesTable rows={result.rows} startIndex={1} dict={tableDict} hrefBase={hrefBase} />
    </section>
  );
}
