import type { Currency } from '@/lib/api/currencies';

import { Coin } from '../homepage/Coin';

import styles from './currencies.module.css';

interface Props {
  currency: Currency;
  index: number;
  exchangeCta: string;
  /** Locale prefix for hrefs — empty string for default `en`, `/<locale>` otherwise. */
  hrefBase: string;
}

/**
 * One row in the listing table. Server-rendered, no JS dependencies — the
 * row is a navigable HTML element on its own and the action button is a
 * plain `<a>`. Whole-row click would require JS, so we keep it simple:
 * the row is informational, the CTA-cell is the click target. Matches the
 * legacy /currencies UX closely without the JS overhead of full-row
 * delegation.
 */
export function CurrenciesRow({ currency, index, exchangeCta, hrefBase }: Props) {
  const href = `${hrefBase}/currencies/${currency.link || currency.currentTicker}`;
  return (
    <tr className={styles.row}>
      <td className={`${styles.cell} ${styles.cellIndex}`}>{index}</td>
      <td className={styles.cell}>
        <div className={styles.cellName}>
          <Coin
            symbol={currency.currentTicker.toUpperCase()}
            iconUrl={currency.iconUrl}
            size={32}
          />
          <span className={styles.cellNameText}>
            <span className={styles.cellNameTitle}>{currency.name || currency.currentTicker.toUpperCase()}</span>
            <span className={styles.cellNameTicker}>{currency.currentTicker}</span>
          </span>
        </div>
      </td>
      <td className={`${styles.cell} ${styles.cellNetwork}`}>{currency.network || '—'}</td>
      <td className={`${styles.cell} ${styles.cellAction}`}>
        <a href={href} className={styles.actionLink}>
          {exchangeCta} →
        </a>
      </td>
    </tr>
  );
}
