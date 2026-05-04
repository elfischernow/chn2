import { createT } from '@/lib/i18n/createT';

import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface Step {
  title?: string;
  /** Plain-text fallback (older records). */
  description?: string;
  /** Markdown / HTML body (newer records mirror prod's "answer" field). */
  content?: string;
  /** Some how-to records expose the body as `text`. */
  text?: string;
  /** Per-step CTA label. Currently unused by the renderer but kept on
   *  the type so future styling additions don't have to widen it. */
  buttonLabel?: string;
  step?: number;
  id?: number;
}

/**
 * `currency-flow.how-to-buy-sell` — numbered steps. Strapi delivers
 * `items: Step[]` where each step's body lives under `content` (HTML),
 * `description` (plain text), or `text` (legacy). RichText handles all
 * three flavours and decodes any HTML-encoded entities.
 */
export function HowToBuySell({ block, page, dict }: BlockProps) {
  const t = createT(dict);
  const items = Array.isArray(block.items) ? (block.items as Step[]) : [];
  if (items.length === 0) return null;
  const title =
    (block.title as string) || t('CURRENCIES_PAGE.HOW_TO_TITLE', { name: page.name });
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ol className={styles.steps}>
        {items.map((s, i) => {
          const body = s.content || s.description || s.text || '';
          return (
            <li key={s.id ?? s.step ?? i} className={styles.step}>
              <div className={styles.stepNum}>{s.step ?? i + 1}</div>
              <div className={styles.stepBody}>
                {s.title && <div className={styles.stepTitle}>{s.title}</div>}
                {body && (
                  <RichText content={body} variant="inline" className={styles.stepText} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
