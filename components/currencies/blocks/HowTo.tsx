import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.how-to` — pair-page variant of `how-to-buy-sell`. Strapi
 * delivers the body as `content` or `description` (string). Some legacy
 * records have raw HTML in there (with anchor tags pointing at coin
 * pages), some have markdown, some have HTML-encoded HTML. RichText
 * normalizes all three.
 */
export function HowTo({ block }: BlockProps) {
  const title = (block.title as string) ?? '';
  const content = (block.content as string) || (block.description as string) || '';
  if (!title && !content) return null;
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      <RichText content={content} />
    </section>
  );
}
