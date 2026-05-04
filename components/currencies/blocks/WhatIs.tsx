import { createT } from '@/lib/i18n/createT';

import { renderRichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.what-is` — descriptive copy. Strapi sends markdown,
 * raw HTML, or sometimes HTML-encoded HTML; the markdown variant uses
 * `## ` / `### ` sub-headings (3 h3 sections on Bitcoin et al.).
 *
 * We split markdown on heading lines so each heading becomes an `<h3>`
 * with an anchor id (the prod outline crawlers see — "How to Get Bitcoin",
 * "How Much Is BTC?", "Why Bitcoin Matters"). Each between-heading chunk
 * goes through `RichText` so inline markdown / HTML / HTML-entity content
 * renders identically, no matter the editor's mood that day.
 *
 * HTML-only payloads (no leading `## ` / `### `) skip the splitter and
 * render as a single rich block.
 */
export function WhatIs({ block, page, dict }: BlockProps) {
  const t = createT(dict);
  const title =
    (block.title as string) || t('CURRENCIES_PAGE.WHAT_IS_TITLE', { name: page.name });
  const description = (block.description as string) || page.description || '';
  if (!description) return null;

  const sections = splitOnMarkdownHeadings(description);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.whatIsLayout}>
        <div className={styles.proseCard}>
          <div className={styles.prose}>
            {sections.map((s, i) => (
              <SectionPart key={i} part={s} />
            ))}
          </div>
        </div>
        {page.iconUrl && (
          <div className={styles.whatIsLogoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.iconUrl} alt="" decoding="async" loading="lazy" />
          </div>
        )}
      </div>
    </section>
  );
}

function SectionPart({ part }: { part: SplitPart }) {
  if (part.type === 'h3') {
    return (
      <h3 id={slugify(part.text)} className={styles.proseH3}>
        {part.text}
      </h3>
    );
  }
  const html = renderRichText(part.text);
  if (!html) return null;
  return (
    <div
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type SplitPart = { type: 'h3'; text: string } | { type: 'body'; text: string };

/**
 * Split a markdown blob on level-2/3 ATX headings, keeping each heading
 * as its own part. The body parts go back through the markdown renderer.
 * Returns a single `body` part when no heading lines are present (e.g.
 * raw HTML payloads).
 */
function splitOnMarkdownHeadings(raw: string): SplitPart[] {
  const text = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const headingRe = /^(#{2,3})\s+(.+)$/gm;
  const parts: SplitPart[] = [];

  let last = 0;
  for (const m of text.matchAll(headingRe)) {
    const idx = m.index ?? 0;
    if (idx > last) {
      const before = text.slice(last, idx).trim();
      if (before) parts.push({ type: 'body', text: before });
    }
    parts.push({ type: 'h3', text: m[2]!.trim() });
    last = idx + m[0].length;
  }
  const tail = text.slice(last).trim();
  if (tail) parts.push({ type: 'body', text: tail });
  return parts.length > 0 ? parts : [{ type: 'body', text }];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
