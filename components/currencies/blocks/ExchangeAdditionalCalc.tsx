import { getCurrencies } from '@/lib/api/currencies';
import { createT } from '@/lib/i18n/createT';

import { PresetSwapWidget } from '../PresetSwapWidget';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.start-exchange` (and any block with the same slot) —
 * mid-page horizontal calculator with a section heading. Mirrors legacy
 * `exchange-additional-calc` markup. Reuses the homepage SwapWidget with
 * the page's coin pre-selected.
 */
export async function ExchangeAdditionalCalc({ block, page, counter, dict }: BlockProps) {
  const t = createT(dict);
  const title =
    (block.title as string) ||
    t('CURRENCIES_PAGE.START_TITLE', `Start ${page.name} Exchange`, { name: page.name });
  const currencies = await getCurrencies();

  return (
    <section className={`${styles.section} ${styles.calcWrap}`}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <PresetSwapWidget
        currencies={currencies}
        fromTicker={page.ticker}
        fromNetwork={page.network}
        toTicker={counter?.ticker}
        toNetwork={counter?.network}
      />
    </section>
  );
}
