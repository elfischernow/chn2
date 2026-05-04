import { getWalletsForNetwork } from '@/lib/api/content/wallets';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.wallets` — list of recommended wallets that support
 * the page's network. Reads from `/wallets?network=<x>`. Wallet logos
 * lazy-load (the user might never scroll this far on a long coin page).
 */
export async function Wallets({ block, page }: BlockProps) {
  const wallets = await getWalletsForNetwork(page.network);
  if (wallets.length === 0) return null;

  const title = (block.title as string) || `Wallets for ${page.name}`;
  const description = (block.description as string) ?? '';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDesc}>{description}</p>}
      <ul className={styles.bullets}>
        {wallets.map((w) => (
          <li key={w.id} className={styles.bullet}>
            <span className={styles.bulletTitle}>
              {w.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={w.logoUrl}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  style={{ verticalAlign: 'middle', marginRight: 8 }}
                />
              ) : null}
              {w.name}
              {w.isComingSoon ? (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-3)' }}>
                  (soon)
                </span>
              ) : null}
            </span>
            {w.link ? (
              <a
                href={w.link}
                className={styles.bulletText}
                rel="nofollow noopener"
                target="_blank"
              >
                Open wallet →
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
