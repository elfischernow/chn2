import { Coin } from '@/components/homepage/Coin';
import { getCurrencies } from '@/lib/api/currencies';
import { createT } from '@/lib/i18n/createT';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.explore-and-exchange-crypto` — cross-link block surfacing
 * popular destinations. On a coin page it shows links to the top-N coin
 * pages; on a pair page it tilts toward the FROM coin's most-popular
 * counterparts. Server-fetches the catalog once (cached upstream) and
 * renders inline — no client interaction needed.
 */
export async function ExploreAndExchangeCrypto({
  block,
  page,
  hrefBase,
  dict,
  counter,
}: BlockProps) {
  const t = createT(dict);
  const all = await getCurrencies();
  const candidates = all
    .filter((c) => c.link !== page.link && c.link !== counter?.link && (c.isPopular || c.isPopularFiat))
    .slice(0, 12);
  if (candidates.length === 0) return null;

  const title = (block.title as string) || t('CURRENCIES_PAGE.EXPLORE_TITLE', 'Explore and exchange crypto');
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.bullets}>
        {candidates.map((c) => (
          <li key={c.link} className={styles.bullet}>
            <a
              className={styles.bulletTitle}
              href={`${hrefBase}/currencies/${c.link}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Coin symbol={c.currentTicker.toUpperCase()} iconUrl={c.iconUrl} size={20} />
              <span>{c.name}</span>
            </a>
            <span className={styles.bulletText}>{c.currentTicker.toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
