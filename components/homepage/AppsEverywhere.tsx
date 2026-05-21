'use client';

import { useState, type ReactElement } from 'react';

import type { Currency } from '@/lib/api/currencies';
import { APPS as APP_LINKS, CN_SITE_URL, FAMILY, PRODUCTS, SUPPORT } from '@/lib/links';

import { PhoneCalculator } from './PhoneCalculator';

type TabId = 'mobile' | 'desktop' | 'ai';

interface SurfaceButton {
  /** When present, render the legacy SVG badge at this path. */
  badge?: { src: string; alt: string; width: number; height: number };
  /** Otherwise we render a custom icon + label/sub pair. */
  icon?: ReactElement;
  label?: string;
  sub?: string;
  href: string;
}

interface Tab {
  id: TabId;
  label: string;
  visual: (props: { currencies: readonly Currency[] }) => ReactElement;
  buttons: SurfaceButton[];
  foot?: ReactElement;
}

const APPLE_PATH =
  'M17.25 4.88C18.28 3.66 18.98 2.01 18.78 0.33c-1.48.06-3.33.97-4.4 2.16-.94 1.05-1.78 2.76-1.57 4.38 1.66.12 3.37-.79 4.44-1.99zM21 15.4c-.03-3.55 3.04-5.3 3.23-5.4-1.77-2.45-4.51-2.78-5.47-2.81-1.41-.14-2.79.38-3.92.8-.72.27-1.33.5-1.79.5-.52 0-1.15-.24-1.86-.51-.93-.35-1.99-.76-3.09-.74-2.5.04-4.84 1.41-6.13 3.55-2.65 4.36-.67 10.76 1.87 14.28 1.27 1.72 2.76 3.65 4.7 3.58.88-.03 1.51-.28 2.16-.54.74-.3 1.52-.61 2.75-.61 1.16 0 1.91.3 2.62.59.68.28 1.34.54 2.31.52 2.04-.03 3.32-1.73 4.55-3.47 1.47-1.98 2.06-3.92 2.08-4.02-.05-.02-3.96-1.43-4-5.72z';

function Glyph({ d, vb = '0 0 24 24' }: { d: string; vb?: string }) {
  return (
    <svg viewBox={vb} width="20" height="20" fill="currentColor" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d={d} />
    </svg>
  );
}

/* ── Visuals ─────────────────────────────────────────────────────────── */

// Replaces the old two-phone PNG composition. The frame is a real device-
// shaped SVG (notch, side buttons, rounded corners — see
// `public/images/landing-assets/iphone-frame.svg`, 476×986 with the inner
// screen rect at (18, 15) sized 440×956). Inside the screen we mount the
// full `SwapWidget` so the visual is a real, functional calculator — the
// section's whole point is "every surface", and a static screenshot
// undersells that. Phone-only style overrides (.phone-screen .widget …)
// live in app/globals.css so the same component renders flat-on-white
// here vs. glass-on-paper in Hero without forking the component.
function MobileVisual({ currencies }: { currencies: readonly Currency[] }) {
  return (
    <div className="apps-phone">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="apps-phone-frame"
        src="/images/landing-assets/iphone-frame.svg"
        alt=""
        width={476}
        height={986}
        loading="lazy"
        decoding="async"
        aria-hidden
      />
      <div className="apps-phone-screen">
        <PhoneCalculator currencies={currencies} />
      </div>
    </div>
  );
}

function DesktopVisual() {
  return (
    <div className="apps-mac" aria-hidden>
      <div className="apps-mac-chrome">
        <span className="apps-mac-dot" style={{ background: '#FF5F57' }} />
        <span className="apps-mac-dot" style={{ background: '#FEBC2E' }} />
        <span className="apps-mac-dot" style={{ background: '#28C840' }} />
        <span className="apps-mac-url">changenow.io / exchange</span>
      </div>
      <div className="apps-mac-body">
        <div className="apps-mac-pane">
          <div className="apps-mac-row">
            <span className="apps-mac-row-label">You send</span>
            <span className="apps-mac-row-amt">1.0000 <strong>BTC</strong></span>
          </div>
          <div className="apps-mac-arrow">⇅</div>
          <div className="apps-mac-row">
            <span className="apps-mac-row-label">You get</span>
            <span className="apps-mac-row-amt">19.3214 <strong>ETH</strong></span>
          </div>
          <div className="apps-mac-cta">Exchange</div>
        </div>
        <div className="apps-mac-side">
          <div className="apps-mac-tick">
            <span>BTC</span><span className="up">+2.1%</span>
          </div>
          <div className="apps-mac-tick">
            <span>ETH</span><span className="up">+3.4%</span>
          </div>
          <div className="apps-mac-tick">
            <span>SOL</span><span className="up">+5.8%</span>
          </div>
          <div className="apps-mac-tick">
            <span>USDC</span><span className="flat">0.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIVisual() {
  return (
    <div className="apps-ai" aria-hidden>
      <div className="apps-ai-bubble user">
        <span className="apps-ai-who">You</span>
        Buy me 0.5 BTC with USDC on the cheapest chain.
      </div>
      <div className="apps-ai-bubble agent">
        <span className="apps-ai-who">
          <span className="apps-ai-dot" /> Agent · MCP
        </span>
        Routed through ChangeNOW. Quote: <strong>52,114.30 USDC</strong> → 0.5 BTC,
        Tron route, fixed-rate. Confirm?
      </div>
      <div className="apps-ai-actions">
        <span className="apps-ai-btn primary">Confirm swap</span>
        <span className="apps-ai-btn">Refresh quote</span>
      </div>
    </div>
  );
}

/* ── Buttons per tab ─────────────────────────────────────────────────── */

const MOBILE_BUTTONS: SurfaceButton[] = [
  { badge: { src: '/images/apps/app-store-badge.svg',   alt: 'Download on the App Store',  width: 133, height: 44 }, href: APP_LINKS.ios },
  { badge: { src: '/images/apps/google-play-badge.svg', alt: 'Get it on Google Play',      width: 133, height: 44 }, href: APP_LINKS.android },
  { badge: { src: '/images/apps/apk-badge.svg',         alt: 'Download APK',               width: 139, height: 41 }, href: APP_LINKS.android },
];

const DESKTOP_BUTTONS: SurfaceButton[] = [
  {
    icon: <Glyph d="M3 5h18v11H3z M3 16l18 0 M9 21h6 M10 18l-1 3 M14 18l1 3" />,
    label: 'Web app',
    sub: 'changenow.io',
    href: CN_SITE_URL || '/',
  },
  {
    icon: <Glyph d={APPLE_PATH} />,
    label: 'macOS',
    sub: 'NOW Wallet · .dmg',
    href: FAMILY.nowWallet,
  },
  {
    icon: <Glyph d="M3 5h8v8H3zM13 5h8v8h-8zM3 15h8v8H3zM13 15h8v8h-8z" />,
    label: 'Windows',
    sub: 'NOW Wallet · .exe',
    href: FAMILY.nowWallet,
  },
  {
    icon: <Glyph d="M12 2a4 4 0 0 0-4 4c0 1.7.84 3.07 1.65 4.5C9 12 8 13 8 14.5c0 1.4-.5 2.4-1.5 3.5-.7.8-1.5 1.5-1.5 3 0 .8.5 1 1 1h12c.5 0 1-.2 1-1 0-1.5-.8-2.2-1.5-3-1-1.1-1.5-2.1-1.5-3.5 0-1.5-1-2.5-1.65-4 .81-1.43 1.65-2.8 1.65-4.5a4 4 0 0 0-4-4z" />,
    label: 'Linux',
    sub: 'NOW Wallet · .AppImage',
    href: FAMILY.nowWallet,
  },
];

const AI_BUTTONS: SurfaceButton[] = [
  {
    icon: <Glyph d="M12 2 4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4zm-3 12h6v2H9v-2zm0-3h6v2H9v-2zm1-4h4v2h-4V7z" />,
    label: 'MCP server',
    sub: 'Claude, Cursor & co.',
    href: PRODUCTS.mcp,
  },
  {
    icon: <Glyph d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.55 7.32c-.12.52-.42.65-.85.4l-2.36-1.74-1.14 1.1c-.13.13-.23.23-.47.23l.17-2.4 4.36-3.94c.19-.17-.04-.26-.29-.1L8.97 13l-2.32-.72c-.5-.16-.51-.5.11-.74l9.06-3.5c.42-.16.79.1.66.76z" />,
    label: 'Telegram bot',
    sub: 'Swap inside any chat',
    href: APP_LINKS.telegramBot,
  },
  {
    icon: <Glyph d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
    label: 'Telegram mini-app',
    sub: 'Full app, inside Telegram',
    href: APP_LINKS.extension,
  },
];

const TABS: Tab[] = [
  { id: 'mobile',  label: 'Mobile',  visual: ({ currencies }) => <MobileVisual currencies={currencies} />, buttons: MOBILE_BUTTONS },
  { id: 'desktop', label: 'Desktop', visual: () => <DesktopVisual />, buttons: DESKTOP_BUTTONS },
  { id: 'ai',      label: 'AI',      visual: () => <AIVisual />,      buttons: AI_BUTTONS },
];

function Button({ b }: { b: SurfaceButton }) {
  if (b.badge) {
    return (
      <a className="apps-badge" href={b.href} aria-label={b.badge.alt}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={b.badge.src}
          alt={b.badge.alt}
          width={b.badge.width}
          height={b.badge.height}
          loading="lazy"
          decoding="async"
        />
      </a>
    );
  }
  return (
    <a className="apps-btn" href={b.href}>
      <span className="apps-btn-ic">{b.icon}</span>
      <span className="apps-btn-text">
        <span className="apps-btn-name">{b.label}</span>
        <span className="apps-btn-sub">{b.sub}</span>
      </span>
      <span className="apps-btn-arrow">→</span>
    </a>
  );
}

interface AppsEverywhereProps {
  currencies: readonly Currency[];
}

export function AppsEverywhere({ currencies }: AppsEverywhereProps) {
  const [active, setActive] = useState<TabId>('mobile');
  const tab = TABS.find((t) => t.id === active)!;
  const isBadgeRow = tab.buttons.every((b) => Boolean(b.badge));
  return (
    <section className="apps-section">
      <div className="apps-head">
        <div className="apps-eyebrow">
          <span className="apps-eyebrow-dot" /> Where you already are
        </div>
        <h2>
          One account.<br />
          <span className="tr-h2-light">Every surface.</span>
        </h2>
        <p className="apps-sub">
          Phone, browser, chat, or the agent on your laptop. Swap, top up and move
          funds without learning a new app.
        </p>
        <div className="apps-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              className={'apps-tab ' + (active === t.id ? 'on' : '')}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="apps-grid">
        <div className="apps-l" key={tab.id}>{tab.visual({ currencies })}</div>
        <div className="apps-r">
          <div className={'apps-buttons ' + (isBadgeRow ? 'as-badges' : 'as-rows')}>
            {tab.buttons.map((b, i) => <Button key={i} b={b} />)}
          </div>
          <p className="apps-foot">
            Need something custom? <a href={SUPPORT.contact}>Contact us</a> about API
            or white-label access.
          </p>
        </div>
      </div>
    </section>
  );
}
