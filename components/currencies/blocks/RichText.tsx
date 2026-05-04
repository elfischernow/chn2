import { marked } from 'marked';

import styles from './blocks.module.css';

interface Props {
  /** Content from Strapi. May be markdown, raw HTML, HTML-encoded HTML, or plain text. */
  content: string | null | undefined;
  /**
   * Wrap the rendered HTML in `.proseCard` + `.prose` (matches the
   * outline used by every long-form block). Set false when the caller
   * already provides its own surface — e.g. the FAQ accordion uses
   * RichText for individual answer bodies and shouldn't get a card.
   */
  variant?: 'card' | 'inline';
  className?: string;
}

/**
 * Render rich text from the CMS. Strapi feeds this anything from clean
 * markdown (`## Heading`, `- bullet`) to raw HTML (`<p>...<a>`) to —
 * occasionally — HTML-encoded HTML (`&lt;p&gt;`) where a previous editor
 * pasted source through the wrong field. We normalize all three:
 *
 *  1. Decode HTML entities so `&lt;p&gt;` becomes `<p>` (no-op for clean
 *     markdown / HTML).
 *  2. If the result already looks like HTML (`<p>`, `<h2>`, `<a href>`),
 *     pass through verbatim.
 *  3. Otherwise, run it through `marked` — it accepts a markdown / HTML
 *     superset, so embedded inline HTML inside markdown also works.
 *
 * No sanitizer: content is admin-controlled (Strapi requires login) and
 * the same payload renders on prod without one. If the threat model ever
 * changes, drop in `isomorphic-dompurify` here — it's the only chokepoint.
 */
export function RichText({ content, variant = 'card', className }: Props) {
  if (!content) return null;
  const html = renderRichText(content);
  if (!html) return null;
  if (variant === 'inline') {
    return (
      <div
        className={className ?? styles.prose}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <div className={styles.proseCard}>
      <div
        className={className ?? styles.prose}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * Convert mixed CMS input into a single HTML string. Exported so callers
 * that want to render outside the standard `.prose` shell (FAQ answers,
 * accordion bodies) can reuse the same normalization.
 */
export function renderRichText(raw: string): string {
  const decoded = decodeEntities(raw);
  // Empty string after trim — return nothing so the caller can drop the
  // wrapper completely.
  if (!decoded.trim()) return '';

  if (looksLikeHtml(decoded)) {
    // Already HTML — return verbatim. Marked would also accept it, but
    // would wrap loose runs of text in `<p>`, which can break inline-only
    // payloads (e.g. a single `<a>...</a>` that the editor placed without
    // surrounding markup).
    return decoded;
  }
  // Markdown path. `marked` is sync when `async` is false; cast so TS
  // doesn't widen to `string | Promise<string>`.
  return marked.parse(decoded, { async: false, gfm: true, breaks: false }) as string;
}

/** Treat content as HTML if it contains a recognizable element tag. */
function looksLikeHtml(s: string): boolean {
  return /<\/?(p|a|h[1-6]|ul|ol|li|strong|em|b|i|br|div|span|img|table|tr|td|th)[\s/>]/i.test(s);
}

/**
 * Decode the handful of HTML entities CMS payloads have shipped to date
 * (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, `&nbsp;`). A full DOM-based
 * decoder would pull in JSDOM at SSR — overkill for the entity set we
 * actually see. Numeric entities aren't used by the editor.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
