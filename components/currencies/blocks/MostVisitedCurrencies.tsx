import { resolveStrapiIconUrl } from '@/lib/api/content/icon-url';

import { Coin } from '../../homepage/Coin';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface CoinRef {
  id?: number;
  ticker?: string;
  current_ticker?: string;
  name?: string;
  link?: string;
  network?: string;
  icon?: { url?: string } | null;
}

/**
 * `currency-flow.most-visited-cryptocurrencies` — chip grid of coins admin
 * picked as "most visited / popular alternatives". Pill style with the
 * actual CMS-supplied icon, coin name, and ticker — port of the legacy
 * `most-visited-currency-item` component. Skip the page's own coin so we
 * don't link to ourselves.
 */
export function MostVisitedCurrencies({ block, page, hrefBase }: BlockProps) {
  const items: CoinRef[] = Array.isArray(block.most_popular_currencies)
    ? (block.most_popular_currencies as CoinRef[])
    : [];
  const filtered = items.filter((c) => c.link && c.link !== page.link);
  if (filtered.length === 0) return null;
  const title = (block.title as string) || 'Most visited cryptocurrencies';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.pillList}>
        {filtered.slice(0, 24).map((c) => {
          const ticker = (c.current_ticker ?? c.ticker ?? '').toUpperCase();
          const iconUrl = resolveStrapiIconUrl(c.icon?.url);
          return (
            <li key={c.id ?? c.link} className={styles.pillItem}>
              <a href={`${hrefBase}/currencies/${c.link}`} className={styles.pill}>
                <Coin symbol={ticker} size={20} iconUrl={iconUrl} />
                <span className={styles.pillName}>{c.name || ticker}</span>
                <span className={styles.pillTickerMuted}>{ticker}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
