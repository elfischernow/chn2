import { resolveStrapiIconUrl } from '@/lib/api/content/icon-url';
import { CN_SITE_URL } from '@/lib/config';

import { Coin } from '../../homepage/Coin';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface CurrencyRef {
  ticker?: string;
  current_ticker?: string;
  name?: string;
  link?: string;
  icon?: { url?: string } | null;
}

interface PairFiatRow {
  id?: number;
  fiat_currency?: CurrencyRef;
  crypto_currency?: CurrencyRef;
}

/**
 * `currency-flow.popular-fiat-markets` — table of fiat ↔ crypto exchange
 * shortcuts, rendered as compact pills (port of legacy
 * `popular-fiat-markets`). Each pill shows the fiat icon, ticker, the
 * legacy switcher arrow, and the crypto ticker; clicking it routes into
 * the buy/sell flow on the legacy site.
 *
 * Hrefs use the legacy path form `/buy/{fiat-slug}/{crypto-slug}` (or
 * `/buy/{crypto-slug}` when the fiat side equals the page coin) — verified
 * against prod /currencies/bitcoin which links to `/buy/dogecoin`,
 * `/buy/australian-dollar/monero`, etc.
 */
export function PopularFiatMarkets({ block, page }: BlockProps) {
  const rows: PairFiatRow[] = Array.isArray(block.Pairs) ? (block.Pairs as PairFiatRow[]) : [];
  if (rows.length === 0) return null;
  const title = (block.title as string) || 'Popular fiat markets';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.pillList}>
        {rows
          .map((r, i) => {
            const fiat = r.fiat_currency;
            const crypto = r.crypto_currency ?? {
              ticker: page.ticker,
              current_ticker: page.ticker,
              name: page.name,
              link: page.link,
              icon: { url: page.iconUrl ?? undefined },
            };
            if (!fiat?.ticker || !crypto?.ticker) return null;
            const fiatTicker = (fiat.current_ticker ?? fiat.ticker).toUpperCase();
            const cryptoTicker = (crypto.current_ticker ?? crypto.ticker).toUpperCase();
            const fiatSlug = fiat.link ?? fiat.ticker;
            const cryptoSlug = crypto.link ?? crypto.ticker;
            const href = `${CN_SITE_URL}/buy/${fiatSlug}/${cryptoSlug}`;
            const fiatIcon = resolveStrapiIconUrl(fiat.icon?.url);
            const cryptoIcon = resolveStrapiIconUrl(crypto.icon?.url) ?? page.iconUrl;
            return (
              <li key={r.id ?? i} className={styles.pillItem}>
                <a href={href} className={styles.pill}>
                  <Coin symbol={fiatTicker} size={20} iconUrl={fiatIcon} />
                  <span className={styles.pillTicker}>{fiatTicker}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/currencies/legacy/switcher.svg"
                    alt=""
                    width={28}
                    height={28}
                    className={styles.pillSwitcher}
                    loading="lazy"
                    decoding="async"
                  />
                  <Coin symbol={cryptoTicker} size={20} iconUrl={cryptoIcon} />
                  <span className={styles.pillTicker}>{cryptoTicker}</span>
                </a>
              </li>
            );
          })
          .filter(Boolean)}
      </ul>
    </section>
  );
}
