import { getLatestNewsForCoin } from '@/lib/api/content/blog-posts';
import { CN_SITE_URL } from '@/lib/config';
import { createT } from '@/lib/i18n/createT';

import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.latest-news` — latest blog posts tagged with the page's
 * currency. Cards mirror prod's blog-card layout: cover image (16:9),
 * title, author + date footer.
 *
 * Always-on default block (rendered even when admin omits it) so SEO
 * link-equity keeps flowing into the blog.
 */
export async function LatestNews({ block, page, dict }: BlockProps) {
  const posts = await getLatestNewsForCoin(page.link);
  if (posts.length === 0) return null;

  const t = createT(dict);
  const title =
    (block.title as string) ||
    `${t('CURRENCIES_TEMPLATE.LATEST', 'Latest')} ${page.name || page.ticker.toUpperCase()} ${t('CURRENCIES_TEMPLATE.NEWS', 'News')}`;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.newsGrid}>
        {posts.map((p) => (
          <a
            key={p.id}
            className={styles.newsCard}
            href={`${CN_SITE_URL}/blog/${p.slug}`}
            rel="noopener"
          >
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt=""
                className={styles.newsCover}
                loading="lazy"
                decoding="async"
              />
            )}
            <div className={styles.newsBody}>
              <h3 className={styles.newsTitle}>{p.title}</h3>
              <div className={styles.newsMeta}>
                {p.author && <span className={styles.newsAuthor}>{p.author}</span>}
                <span>{formatNewsDate(p.publishedAt)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/** "March 10, 2026" — matches the prod card-footer format. */
function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}
