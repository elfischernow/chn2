import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.exchange-rate` — short blurb showing live rate text. The
 * actual rate value comes from the estimates upstream and is wired up
 * alongside the price-calculator block; for the SEO server-render we just
 * emit the surrounding copy through the rich-text renderer so embedded
 * links / tags reach the user as HTML, not as escaped strings.
 */
export function ExchangeRate({ block, page, counter }: BlockProps) {
  if (!counter) return null;
  const title =
    (block.title as string) ||
    `${page.ticker.toUpperCase()} → ${counter.ticker.toUpperCase()} rate`;
  const text =
    (block.text as string) ||
    (block.text_with_rate as string) ||
    (block.description as string) ||
    '';
  if (!text.trim()) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <RichText content={text} />
    </section>
  );
}
