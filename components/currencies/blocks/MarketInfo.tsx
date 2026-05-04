import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.market-info` — admin-driven heading + optional copy.
 * Live market data (price, market cap) lands here later from a stats
 * upstream; today we render only what the admin has typed. When both
 * the description and the live-data wiring are absent there is nothing
 * to show, so the whole section is dropped to avoid a lonely h2 with
 * no body (matches what prod ships when its widget hasn't loaded yet).
 */
export function MarketInfo({ block }: BlockProps) {
  const title = (block.title as string) ?? '';
  const description = (block.description as string) ?? '';
  if (!description.trim()) return null;
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      <RichText content={description} />
    </section>
  );
}
