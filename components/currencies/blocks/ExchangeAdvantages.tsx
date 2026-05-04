import { LEARN } from '@/lib/links';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

interface Bullet {
  title?: string;
  description?: string;
  id?: number;
}

/**
 * Marketing stat tiles shown in the prod "Why exchange X" card. Numbers
 * mirror the live legacy page; copy is intentionally short. The first
 * three line up with the bullet items the CMS / fallback already
 * provides; the fourth ("currencies available") is sitewide and stays
 * static here.
 */
const STAT_TILES = [
  { num: '98%', label: 'Triumph Rate 🔥' },
  { num: '2 min', label: 'Average Exchange Time' },
  { num: '5M+', label: 'Satisfied Clients' },
  { num: '1267', label: 'Currencies available for exchange' },
];

/**
 * `currency-flow.exchange-advantages` and `.why-exchange-on-change-now`
 * share a 3-column bullet grid. They differ only in the field name
 * (`items` vs `content`) — handled by trying both.
 *
 * When the block is enabled but admin hasn't filled in items, we still
 * emit the section h2 + an i18n-driven default body. Legacy renders the
 * heading regardless (verified against prod /currencies/bitcoin where
 * `hasItems=False` for `why-exchange-on-change-now` but the h2 is still
 * present); skipping it would lose the section landmark.
 */
/**
 * Static fallback bullets — rendered when neither `items` nor `content`
 * is set on the Strapi block. Prod legacy emits the same copy via i18n
 * (`MAIN.WHY_EXCHANGE_*`) so the section never ships empty even on
 * minimal admin entries. Numbers mirror the live prod page.
 *
 * `id`s are negative so they don't collide with Strapi-supplied positive
 * ones (the Bullet type uses `id` as React key; mixing with API ids would
 * trip duplicate-key warnings if both ever surfaced).
 */
const FALLBACK_BULLETS: Bullet[] = [
  {
    id: -1,
    title: '98% Triumph Rate',
    description: 'Swaps completed with the best-in-class success rate.',
  },
  {
    id: -2,
    title: '~2 minutes',
    description: 'Average time from sending crypto to receiving the swap.',
  },
  {
    id: -3,
    title: 'No account required',
    description: 'Exchange instantly — no sign-up, no KYC for crypto-to-crypto swaps.',
  },
];

export function ExchangeAdvantages({ block, page }: BlockProps) {
  const apiItems = pickBullets(block);
  const items = apiItems.length > 0 ? apiItems : FALLBACK_BULLETS;
  const title = (block.title as string) || `Why exchange ${page.name} on ChangeNOW`;
  const description =
    (block.description as string) ||
    'The average time for exchange is about 2 minutes. You can track the crypto swap progress on the exchange page.';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.advCard}>
        <div className={styles.advCopy}>
          <p>{description}</p>
          <div className={styles.advStats}>
            {STAT_TILES.map((s) => (
              <div key={s.num} className={styles.advStat}>
                <span className={styles.advStatNum}>{s.num}</span>
                <span className={styles.advStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
          <a className={styles.advLink} href={LEARN.howItWorks}>
            How it works?
          </a>
        </div>
        <picture>
          <source
            type="image/png"
            srcSet="/images/currencies/legacy/why-exchange.png 1x, /images/currencies/legacy/why-exchange-2x.png 2x"
            media="(min-width: 992px)"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/currencies/legacy/why-exchange-small.png"
            srcSet="/images/currencies/legacy/why-exchange-small.png 1x, /images/currencies/legacy/why-exchange-small-2x.png 2x"
            alt=""
            className={styles.advArt}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      {/* Keep the original bullet list as hidden SEO outline so crawlers
          still see "98% Triumph Rate / ~2 minutes / No account required"
          h3s. The visual cards above duplicate the headline numbers but
          drop the descriptions. */}
      <ul className={styles.advHiddenBullets} aria-hidden="false">
        {items.map((b, i) => (
          <li key={b.id ?? i}>
            {b.title && <h3>{b.title}</h3>}
            {b.description && <p>{b.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function pickBullets(block: Record<string, unknown>): Bullet[] {
  if (Array.isArray(block.items)) return block.items as Bullet[];
  if (Array.isArray(block.content)) return block.content as Bullet[];
  return [];
}
