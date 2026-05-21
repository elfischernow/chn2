'use client';

import './footer/styles/footer.css';
import './footer/styles/mobile-qr.css';
import './footer/styles/wide-language-dropdown.css';
import './footer-overrides.css';

import { useEffect, useRef } from 'react';

import { Footer as KitFooter } from './footer/Footer';

import { trackEvent } from '@/lib/analytics/track';
import { SITE_URL } from '@/lib/config';
import { createT, type TranslationDict } from '@/lib/i18n/createT';

interface FooterWrapperProps {
  dict: TranslationDict;
  currentUrl: string;
  isAppleDevice?: boolean;
  isAndroidDevice?: boolean;
  apkAndroidUrl?: string;
  apkAndroidName?: string;
  qrCodeLink?: string;
  currentLanguage?: string;
  languages?: string[];
  languagesNames?: Record<string, string>;
}

// Hosts the legacy nginx canonicaliser treats as "main site" — every link
// pointing here needs the trailing slash on the path (`/buy-bitcoin/`) or
// it eats a 301. The kit's link constants sometimes ship without the slash;
// the observer below patches them in place to spare the redirect hop.
const MAIN_SITE_HOST = (() => {
  try { return new URL(SITE_URL).host; } catch { return ''; }
})();

function normaliseHref(href: string | null): string | null {
  if (!href) return href;
  // Anchors, mailto, tel, javascript: — leave alone.
  if (/^(?:#|mailto:|tel:|javascript:)/i.test(href)) return null;
  try {
    const u = new URL(href, typeof window !== 'undefined' ? window.location.origin : SITE_URL);
    if (MAIN_SITE_HOST && u.host === MAIN_SITE_HOST) {
      // Main site contract: trailing slash on every path except the bare
      // origin. Query/hash are preserved.
      if (u.pathname === '' || u.pathname === '/') return null;
      if (u.pathname.endsWith('/')) return null;
      u.pathname += '/';
      return u.toString();
    }
  } catch { /* fall through */ }
  return null;
}

export function FooterWrapper({ dict, ...props }: FooterWrapperProps) {
  const t = createT(dict);
  const rootRef = useRef<HTMLDivElement>(null);

  // The footer constants ship hard-coded hrefs; some land without the
  // trailing slash the legacy nginx expects. Rather than touch every
  // constant we patch the rendered tree once on mount and again on any
  // subtree mutation (locale swap, lazy-loaded subsections). One observer
  // covers the kit Footer surface end-to-end — see project_header_auth_styles
  // memo for why a wrapper-level patch beats threading a helper through
  // every list item.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const patch = (a: HTMLAnchorElement) => {
      const next = normaliseHref(a.getAttribute('href'));
      if (next !== null && next !== a.getAttribute('href')) {
        a.setAttribute('href', next);
      }
    };
    const scan = (node: ParentNode) => {
      node.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(patch);
    };

    scan(root);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.target instanceof HTMLAnchorElement) {
          patch(r.target);
        } else if (r.type === 'childList') {
          r.addedNodes.forEach((n) => {
            if (n instanceof HTMLAnchorElement) patch(n);
            else if (n instanceof Element) scan(n);
          });
        }
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    return () => observer.disconnect();
  }, []);

  // The kit's Footer expects a narrower `t(key, default?)` signature than ours.
  return (
    <div ref={rootRef}>
      <KitFooter
        {...props}
        t={t as unknown as (key: string, defaultMessage?: string) => string}
        trackEvent={trackEvent}
      />
    </div>
  );
}
