import { Coin } from '@/components/homepage/Coin';
import { createT } from '@/lib/i18n/createT';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.currency-pair-coin-market-data` — pair-only block. Renders
 * an h2 wrapper around two side-by-side h3 sub-blocks (FROM and TO market
 * data). Live numbers come from a market-info upstream later; for now the
 * shell is the SEO surface — the block exists in the page outline so
 * crawlers see "Bitcoin market data" + "Ethereum market data" h3s for the
 * pair, matching legacy.
 */
export function CurrencyPairCoinMarketData({ block, page, counter, dict }: BlockProps) {
  if (!counter) return null;
  const t = createT(dict);
  const fromTicker = page.ticker.toUpperCase();
  const toTicker = counter.ticker.toUpperCase();

  const title = (block.title as string) || `${fromTicker} and ${toTicker} market data`;
  const fromHeading = t('CURRENCIES_PAIR.COIN_MARKET_DATA', `${page.name} market data`, {
    name: page.name,
  });
  const toHeading = t('CURRENCIES_PAIR.COIN_MARKET_DATA', `${counter.name} market data`, {
    name: counter.name,
  });

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.bullets}>
        <article className={styles.bullet}>
          <span className={styles.bulletTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coin symbol={fromTicker} iconUrl={page.iconUrl} size={20} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{fromHeading}</h3>
          </span>
          <span className={styles.bulletText}>
            Live {page.name} ({fromTicker}) market data and price information.
          </span>
        </article>
        <article className={styles.bullet}>
          <span className={styles.bulletTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coin symbol={toTicker} iconUrl={counter.iconUrl} size={20} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{toHeading}</h3>
          </span>
          <span className={styles.bulletText}>
            Live {counter.name} ({toTicker}) market data and price information.
          </span>
        </article>
      </div>
    </section>
  );
}
