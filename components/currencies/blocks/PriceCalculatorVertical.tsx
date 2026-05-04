import { getCurrencies } from '@/lib/api/currencies';

import { PresetSwapWidget } from '../PresetSwapWidget';
import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.price-calculator-vertical` — pair page mid-flow calculator.
 * Renders the Strapi blurb (markdown / HTML supported via RichText) plus a
 * second instance of the swap widget pre-set to the current pair. Without
 * the embedded calculator the section was just a paragraph telling users to
 * "use our calculator above" with no calculator next to it — the prod page
 * has the actual widget here, and so should we.
 *
 * Server component on purpose so the catalog fetch happens once on the
 * server and the rendered widget HTML ships in the SSR payload.
 */
export async function PriceCalculatorVertical({ block, page, counter }: BlockProps) {
  const title = (block.title as string) ?? '';
  const content = (block.content as string) || (block.description as string) || '';
  if (!title && !content && !counter) return null;

  const currencies = counter ? await getCurrencies() : null;

  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      {content && <RichText content={content} />}
      {counter && currencies && (
        <div className={styles.calcEmbed}>
          <PresetSwapWidget
            currencies={currencies}
            fromTicker={page.ticker}
            fromNetwork={page.network}
            toTicker={counter.ticker}
            toNetwork={counter.network}
          />
        </div>
      )}
    </section>
  );
}
