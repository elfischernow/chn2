import type { ReactElement } from 'react';

import { APPS as APP_LINKS, PRODUCTS, SUPPORT } from '@/lib/links';

interface AppRow {
  name: string;
  sub: string;
  href: string;
  /** Inline SVG glyph — keeps the row weight under one icon font / image. */
  icon: ReactElement;
}

// Icons ported (and trimmed) from the legacy SPA's
// `react-ssr/components/icons` set so the look matches the rest of our
// product surface — Apple/macOS/iOS-flavoured monochrome glyphs sized
// for a 36×36 chip.
const APPLE_PATH =
  'M17.25 4.88C18.28 3.66 18.98 2.01 18.78 0.33c-1.48.06-3.33.97-4.4 2.16-.94 1.05-1.78 2.76-1.57 4.38 1.66.12 3.37-.79 4.44-1.99zM21 15.4c-.03-3.55 3.04-5.3 3.23-5.4-1.77-2.45-4.51-2.78-5.47-2.81-1.41-.14-2.79.38-3.92.8-.72.27-1.33.5-1.79.5-.52 0-1.15-.24-1.86-.51-.93-.35-1.99-.76-3.09-.74-2.5.04-4.84 1.41-6.13 3.55-2.65 4.36-.67 10.76 1.87 14.28 1.27 1.72 2.76 3.65 4.7 3.58.88-.03 1.51-.28 2.16-.54.74-.3 1.52-.61 2.75-.61 1.16 0 1.91.3 2.62.59.68.28 1.34.54 2.31.52 2.04-.03 3.32-1.73 4.55-3.47 1.47-1.98 2.06-3.92 2.08-4.02-.05-.02-3.96-1.43-4-5.72z';
const MACOS_PATH =
  'M3.5 8h2v8h-2zm5-2h2v10h-2zm5 5h2v5h-2zm5-3h2v8h-2zM2 0h20a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm9 23h2v1h-2z';
const ANDROID_PATH =
  'M5.61 16.5h12.78a.5.5 0 0 0 .5-.5V8.5a.5.5 0 0 0-.5-.5H5.61a.5.5 0 0 0-.5.5V16a.5.5 0 0 0 .5.5zm.39-9.94 1.27-2.2a.4.4 0 1 0-.69-.4L5.31 6.1a8.05 8.05 0 0 0-2.42 5.4h18.22a8.05 8.05 0 0 0-2.42-5.4l-1.27-2.14a.4.4 0 1 0-.69.4l1.27 2.2a8.94 8.94 0 0 0-7.99 0zM8.5 9.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm7 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zM3.5 17h1.4a.6.6 0 0 1 .6.6v3.4a1.5 1.5 0 1 1-3 0v-3.4a.6.6 0 0 1 .6-.6h.4zm17 0h1.4a.6.6 0 0 1 .6.6v3.4a1.5 1.5 0 1 1-3 0v-3.4a.6.6 0 0 1 .6-.6h.4zM7 17h1v5.4a1.6 1.6 0 0 1-3.2 0V17H6h1zm9 0h1v5.4a1.6 1.6 0 0 1-3.2 0V17H15h1z';
const TG_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.55 7.32c-.12.52-.42.65-.85.4l-2.36-1.74-1.14 1.1c-.13.13-.23.23-.47.23l.17-2.4 4.36-3.94c.19-.17-.04-.26-.29-.1L8.97 13l-2.32-.72c-.5-.16-.51-.5.11-.74l9.06-3.5c.42-.16.79.1.66.76z';
const CHROME_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z';
const TG_BOT_PATH =
  'M12 2 4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4zm-3 12h6v2H9v-2zm0-3h6v2H9v-2zm1-4h4v2h-4V7z';

function Glyph({ d, vb = '0 0 24 24' }: { d: string; vb?: string }) {
  return (
    <svg
      viewBox={vb}
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={d} />
    </svg>
  );
}

const APPS: ReadonlyArray<AppRow> = [
  { name: 'iOS', sub: 'iPhone & iPad · App Store', href: APP_LINKS.ios, icon: <Glyph d={APPLE_PATH} /> },
  { name: 'Android', sub: 'Phone & tablet · Google Play', href: APP_LINKS.android, icon: <Glyph d={ANDROID_PATH} /> },
  { name: 'macOS', sub: 'Native desktop client', href: APP_LINKS.ios, icon: <Glyph d={MACOS_PATH} /> },
  { name: 'Telegram bot', sub: 'Swap inside any chat', href: APP_LINKS.telegramBot, icon: <Glyph d={TG_PATH} /> },
  { name: 'Telegram mini-app', sub: 'Full app in Telegram', href: APP_LINKS.extension, icon: <Glyph d={TG_BOT_PATH} /> },
  { name: 'MCP server', sub: 'For Claude, Cursor & co.', href: PRODUCTS.mcp, icon: <Glyph d={CHROME_PATH} /> },
];

export function AppsEverywhere() {
  return (
    <section className="apps-section">
      <div className="apps-grid">
        <div className="apps-l">
          <div className="apps-phones">
            {/* Real screenshots from the legacy mobile-app + wallet folders.
                Keep both phones in view: front phone shows the swap UI, back
                phone shows the wallet — narrates "swap + custody in one app"
                without copy. */}
            <picture className="apps-phone-back">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/apps/wallet-phones@2x.png"
                alt="ChangeNOW wallet on iPhone showing balance, asset list and recent activity."
                width={420}
                height={345}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <picture className="apps-phone-front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/apps/swap-iphone@2x.png"
                srcSet="/images/apps/swap-iphone.png 1x, /images/apps/swap-iphone@2x.png 2x"
                alt="ChangeNOW swap on iPhone — Bitcoin to Ethereum quote with 1 BTC ≈ 19.32 ETH."
                width={260}
                height={520}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
        </div>
        <div className="apps-r">
          <div className="apps-eyebrow">
            <span className="apps-eyebrow-dot" /> Available on six surfaces
          </div>
          <h2>
            One account.<br />
            <span className="tr-h2-light">Every surface.</span>
          </h2>
          <p className="apps-sub">
            Web, mobile, desktop, Telegram, and AI agents. Same balances, same history,
            same login. Open one, the rest stay in sync.
          </p>
          <div className="apps-list">
            {APPS.map((a) => (
              <a className="apps-btn" href={a.href} key={a.name}>
                <span className="apps-btn-ic">{a.icon}</span>
                <span className="apps-btn-text">
                  <span className="apps-btn-name">{a.name}</span>
                  <span className="apps-btn-sub">{a.sub}</span>
                </span>
                <span className="apps-btn-arrow">→</span>
              </a>
            ))}
          </div>
          <p className="apps-foot">
            Need something custom? <a href={SUPPORT.contact}>Contact us</a> about API or
            white-label access.
          </p>
        </div>
      </div>
    </section>
  );
}
