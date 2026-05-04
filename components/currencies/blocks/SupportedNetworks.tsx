import { resolveStrapiIconUrl } from '@/lib/api/content/icon-url';
import { buildExchangeUrl } from '@/lib/api/exchange';
import { getNetworkColor, getNetworkInk, getNetworkLabel } from '@/lib/network-colors';

import { Coin } from '../../homepage/Coin';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface NetworkVariant {
  id?: number;
  ticker?: string;
  current_ticker?: string;
  name?: string;
  link?: string;
  network?: string;
  token_contract?: string | null;
  icon?: { url?: string } | null;
}

/**
 * `currency-flow.supported-networks` — table of every network the coin
 * runs on (e.g. native ADA, ADA on BSC; USDT on ERC20 / TRC20 / BEP20 /
 * Solana). Mirrors the legacy `AvailableNetworks` block:
 *
 *   Network col     | Smart contract              | Exchange
 *   icon + sup-tag  | 0x...    [copy button]      | ↑↓ deep-link
 *
 * The current page's own variant is intentionally NOT filtered out —
 * legacy renders it as the first row so users always see the canonical
 * mapping. Rows without a `token_contract` (native chains) leave that
 * column empty.
 */
export function SupportedNetworks({ block, page }: BlockProps) {
  const variants: NetworkVariant[] = Array.isArray(block.currencies)
    ? (block.currencies as NetworkVariant[])
    : [];
  if (variants.length === 0) return null;

  const tickerUpper = page.ticker.toUpperCase();
  const title = (block.title as string) || `Choose available network and swap`;
  const description = (block.description as string) || '';
  const networksHeader = `${tickerUpper} Networks`;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDesc}>{description}</p>}
      <div className={styles.networksTable}>
        <div className={styles.networksHead}>
          <span>{networksHeader}</span>
          <span>Smart contract</span>
          <span style={{ textAlign: 'right' }}>Exchange</span>
        </div>
        <div className={styles.networksBody}>
          {variants.map((v) => {
            const ticker = (v.current_ticker ?? v.ticker ?? '').toUpperCase();
            const iconUrl = resolveStrapiIconUrl(v.icon?.url) ?? page.iconUrl;
            const network = (v.network ?? '').toLowerCase();
            const networkLabel = getNetworkLabel(network);
            const exchangeUrl = buildExchangeUrl({
              from: ticker || page.ticker,
              to: ticker.toLowerCase() === 'btc' ? 'eth' : 'btc',
            });
            return (
              <div key={v.id ?? `${v.link}-${v.network}`} className={styles.networksRow}>
                <div className={styles.networksToken}>
                  <span className={styles.networksIconWrap}>
                    <Coin symbol={ticker} size={48} iconUrl={iconUrl} />
                    {networkLabel && network !== ticker.toLowerCase() && (
                      <sup
                        className={styles.networksSup}
                        style={{
                          background: getNetworkColor(network),
                          color: getNetworkInk(network),
                        }}
                      >
                        {networkLabel}
                      </sup>
                    )}
                  </span>
                  <strong className={styles.networksName}>{v.name || ticker}</strong>
                </div>
                <div className={styles.networksContract}>
                  {v.token_contract && (
                    <code className={styles.networksContractText}>{v.token_contract}</code>
                  )}
                </div>
                <div className={styles.networksExchange}>
                  <a
                    href={exchangeUrl}
                    aria-label={`Exchange ${ticker}`}
                    className={styles.networksExchangeBtn}
                    rel="noopener"
                  >
                    <span aria-hidden>↑↓</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
