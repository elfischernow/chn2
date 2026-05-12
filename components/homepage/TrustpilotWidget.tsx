'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

/**
 * Mounts a Trustpilot TrustBox widget and ensures the loader script
 * (re-)attaches to our node. Trustpilot's bootstrap script auto-scans the
 * DOM on initial load, but it doesn't observe React-mounted nodes — we
 * call `loadFromElement` on mount to bind explicitly.
 *
 * Default template is "Micro Combo" (`5419b6a8b0d04a076446a9ad`) — a
 * single-line wide bar with TrustScore + stars + review count + the
 * Trustpilot wordmark. No "Read and write reviews" CTA, no hover
 * tooltip, no inflated height — just the trust signal, full-width.
 *
 * Theme defaults to "auto": the component watches `documentElement
 * [data-theme]` and re-renders the embed with `data-theme="dark"` when
 * the rest of the page flips dark, so the "Trustpilot" wordmark stays
 * legible instead of disappearing into a dark backdrop.
 */
interface Props {
  /** Trustpilot template id. */
  template?: string;
  /** Business-unit id. Defaults to ChangeNOW's. */
  businessUnitId?: string;
  /** "auto" follows document[data-theme]; explicit values pin the embed. */
  theme?: 'light' | 'dark' | 'auto';
  /** Locale string Trustpilot will render the widget in. */
  locale?: string;
  /** Override the explicit pixel height (px). */
  height?: number;
  /** Override the explicit width (% or px string). */
  width?: string;
  /** Optional className for layout-level overrides. */
  className?: string;
}

declare global {
  interface Window {
    Trustpilot?: { loadFromElement?: (el: HTMLElement, force?: boolean) => void };
  }
}

export function TrustpilotWidget({
  template = '5419b6a8b0d04a076446a9ad',
  businessUnitId = '59d561c60000ff0005acd2a4',
  theme = 'auto',
  locale = 'en-US',
  height = 28,
  width = '100%',
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    theme === 'dark' ? 'dark' : 'light',
  );

  // Track document[data-theme] for the auto setting. We re-emit
  // `data-theme` on the widget div whenever it flips; the useEffect
  // below depends on `resolvedTheme`, so the bootstrap script gets
  // re-called and rebuilds the iframe with the matching palette.
  useEffect(() => {
    if (theme !== 'auto') {
      setResolvedTheme(theme);
      return;
    }
    const root = document.documentElement;
    const read = () => {
      const t = root.getAttribute('data-theme');
      setResolvedTheme(t === 'dark' ? 'dark' : 'light');
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [theme]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tryLoad = () => {
      if (window.Trustpilot?.loadFromElement) {
        window.Trustpilot.loadFromElement(el, true);
        return true;
      }
      return false;
    };
    if (tryLoad()) return;
    // Script may not have downloaded yet — poll for it briefly. Cheap,
    // gives up after a few seconds so we don't hammer indefinitely if
    // the script is blocked (CSP, ad-blocker, offline).
    const start = Date.now();
    const id = window.setInterval(() => {
      if (tryLoad() || Date.now() - start > 8000) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [template, businessUnitId, resolvedTheme]);

  return (
    <>
      <Script
        id="trustpilot-bootstrap"
        src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="lazyOnload"
      />
      <div
        ref={ref}
        className={'trustpilot-widget' + (className ? ' ' + className : '')}
        data-locale={locale}
        data-template-id={template}
        data-businessunit-id={businessUnitId}
        data-style-height={`${height}px`}
        data-style-width={width}
        data-theme={resolvedTheme}
        // Suppress hydration warnings on two fronts:
        // 1. Trustpilot's bootstrap script mutates this node post-mount
        //    (adds `style="position: relative"` + injects an iframe).
        // 2. `theme="auto"` resolves to 'light' during SSR but may flip
        //    to 'dark' on the client once `document[data-theme]` is
        //    read, so the `data-theme` attribute itself can differ.
        suppressHydrationWarning
      >
        <a
          href="https://www.trustpilot.com/review/changenow.io"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Trustpilot
        </a>
      </div>
    </>
  );
}
