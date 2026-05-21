'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { Locale } from '@/lib/config';
import type { TranslationDict } from '@/lib/i18n';

import { CN_SITE_URL, DEFAULT_LOCALE } from '@/lib/config';
import { localeHref } from '@/lib/i18n/hrefs';
import { useSession } from '@/lib/auth/useSession';

import ChangeNowLogo from './icons/ChangeNowLogo';
import HeadphonesIcon from './icons/HeadphonesIcon';
import AppsIcon from './icons/AppsIcon';
import SettingsIcon from './icons/SettingsIcon';
import HeadphonesDropdown from './dropdowns/HeadphonesDropdown';
import AppsDropdown from './dropdowns/AppsDropdown';
import SettingsDropdown from './dropdowns/SettingsDropdown';
import AccountDropdown from './dropdowns/AccountDropdown';
import {
  MEGA_MENU,
  MM_BIZ_HIGHLIGHTS,
  NAV_ITEMS,
  NAV_ITEMS_BIZ,
  type MegaMenuId,
} from './header.data';
import { setHeaderMode, useHeaderMode } from './useHeaderMode';

import styles from './Header.module.css';

type Mode = 'personal' | 'business';
type IconDropdown = 'headphones' | 'apps' | 'settings' | 'account';

interface HeaderProps {
  locale: Locale;
  dict: TranslationDict;
  apkAndroidUrl?: string;
  /**
   * Universal-link / QR-target URL for the "scan to install" flow inside
   * `AppsDropdown`. Forwarded as a prop because the underlying env var
   * (`MOBILE_APPS_LINK`) is server-only — reading it from the client would
   * always yield `undefined`.
   */
  mobileAppsUrl?: string;
  /**
   * Optional section badge rendered as a SEPARATE anchor next to the logo
   * (e.g. `{ label: 'Blog', path: '/blog' }`). Two anchors — never one
   * wrapping the other — so middle/Cmd-click works on each independently
   * and screen readers announce two destinations rather than one nested
   * link. `path` is fed through `localeHref` so callers don't repeat the
   * locale-prefix dance.
   */
  badge?: { label: string; path: string };
}

function MegaMenu({ id, mode }: { id: MegaMenuId; mode: Mode }) {
  const cfg = MEGA_MENU[id];
  if (!cfg) return null;
  // Highlight-row reskinning only applies to the personal nav (Exchange/Grow/
  // Transfer/Learn) when the audience switch is flipped to Business. The
  // dedicated B2B menus (Earn/Manage/Build/bizLearn) already carry their
  // own highlights and don't get reswapped — `id in MM_BIZ_HIGHLIGHTS`
  // narrows id to a PersonalMenuId so the lookup is type-safe.
  const sections = cfg.sections.map((s) => {
    if (
      s.kind === 'highlights'
      && mode === 'business'
      && id in MM_BIZ_HIGHLIGHTS
    ) {
      return {
        ...s,
        items: MM_BIZ_HIGHLIGHTS[id as keyof typeof MM_BIZ_HIGHLIGHTS],
      };
    }
    return s;
  });
  return (
    <div className={`mm mm-cols-${cfg.cols}`} role="menu">
      <div className={`mm-grid mm-grid-${cfg.cols}`}>
        {sections.map((s) => (
          <div key={s.title} className="mm-col">
            <div className="mm-h">{s.title}</div>
            {s.kind === 'highlights' ? (
              s.items.map((it) => (
                <a key={it.title} href={it.href} className="mm-hl">
                  <div className={`mm-hl-img tone-${it.tone}`}>
                    <span className="mm-hl-dot" />
                  </div>
                  <div className="mm-hl-text">
                    <div className="mm-hl-row">
                      <span className="mm-hl-title">{it.title}</span>
                      {it.badge && (
                        <span className={`mm-badge ${it.badge.toLowerCase()}`}>{it.badge}</span>
                      )}
                    </div>
                    <div className="mm-hl-sub">{it.sub}</div>
                  </div>
                </a>
              ))
            ) : (
              <ul className="mm-list">
                {s.items.map((it) => (
                  <li key={it.label}>
                    <a href={it.href} className="mm-link">
                      <span>{it.label}</span>
                      {it.soon && <span className="mm-soon">soon</span>}
                    </a>
                    {it.subs && (
                      <ul className="mm-sub">
                        {it.subs.map((sub) => (
                          <li key={sub.label}>
                            <a href={sub.href}>{sub.label}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Header({
  locale,
  dict,
  apkAndroidUrl = '',
  mobileAppsUrl = '',
  badge,
}: HeaderProps) {
  const { session, signOut } = useSession();
  const isLoggedIn = session !== null;
  const router = useRouter();
  const pathname = usePathname();

  const [mode, setModeRaw] = useHeaderMode();
  const navItems = mode === 'business' ? NAV_ITEMS_BIZ : NAV_ITEMS;
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const homePath = localeHref(locale, '/');
  const partnersPath = localeHref(locale, '/for-partners');
  const badgeHref = badge ? localeHref(locale, badge.path) : null;

  // Auth pages render a stripped-down header (logo + business switch +
  // settings only). The switch on these pages pivots to the b2b auth flow
  // instead of `/for-partners`, so users mid-login can swap sides without
  // bouncing through the marketing site.
  const isAuthPage = /^(?:\/[a-z]{2,3})?\/(?:authorization|registration)(?:\/|$)/
    .test(pathname);

  // Business mode pivots both buttons to the affiliate cabinet. Personal
  // mode lands on the in-house unified `/authorization` entry — there's a
  // single screen for "sign in or create account", so both CTAs point at
  // the same URL. `/registration` still exists as a 308 for legacy email
  // links, but Header avoids the extra hop.
  const authLinks = mode === 'business'
    ? { signup: `${CN_SITE_URL}/affiliate`, login: `${CN_SITE_URL}/affiliate` }
    : {
      signup: localeHref(locale, '/authorization'),
      login: localeHref(locale, '/authorization'),
    };

  // Mega-menu (homepage product nav) state.
  const [megaOpen, setMegaOpen] = useState<MegaMenuId | null>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Right-side icon dropdowns — same UX as the blog's BlogHeader.
  const [activeDropdown, setActiveDropdown] = useState<IconDropdown | null>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile menu sheet — only relevant below the breakpoint where the
  // desktop nav + right cluster collapse. The hamburger toggle plus the
  // expanded mega-menu sections live here.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState<MegaMenuId | null>(null);

  // Mode flips reset transient menu state and route the user to the
  // landing for that audience. Earn/Manage/Build/bizLearn aren't valid
  // ids in personal mode (and vice versa), so a stale id would render
  // the wrong panel for one frame.
  const setMode = (next: 'personal' | 'business') => {
    setMegaOpen(null);
    setSheetExpanded(null);
    setSheetOpen(false);
    setModeRaw(next);
    // On auth pages the Business switch should take the user to the b2b
    // login flow, not the marketing partners landing — that's where they
    // can actually sign in as an affiliate. Personal mode stays on the
    // current page (Personal is the default on /authorization itself).
    if (isAuthPage) {
      if (next === 'business') window.location.assign(`${CN_SITE_URL}/affiliate`);
      return;
    }
    const target = next === 'business' ? partnersPath : homePath;
    // Same-route clicks become no-ops — `router.push` would still flicker
    // a network round-trip in dev, and the route-driven pin-on-mount
    // below would otherwise cause a self-redirect.
    if (pathname !== target) router.push(target);
  };

  // Route → mode sync. Any navigation into a business-scoped page pins
  // the audience switch to Business; everything else reverts to
  // Personal. This is the single source of truth — pages don't pin the
  // mode themselves anymore. `setHeaderMode` is the fire-and-forget
  // setter (no navigation side-effect), so this effect can't trigger a
  // redirect loop with `setMode` above.
  //
  // Regex matches `/for-partners` and any locale-prefixed variant
  // (`/ru/for-partners`, `/de/for-partners/foo`, …). The locale is
  // matched as `/[a-z]{2,3}` rather than the full LOCALES list to keep
  // the pattern simple — a non-locale 2-3 letter prefix would fail to
  // resolve as a real page anyway.
  useEffect(() => {
    const isBusinessRoute = /^(?:\/[a-z]{2,3})?\/for-partners(?:\/|$)/.test(pathname);
    setHeaderMode(isBusinessRoute ? 'business' : 'personal');
  }, [pathname]);

  // ─── Mega-menu open/close ───────────────────────────────
  const openMega = (id: MegaMenuId) => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMegaOpen(id);
  };
  const scheduleMegaClose = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMegaOpen(null), 180);
  };
  const cancelMegaClose = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
  };

  // ─── Icon-dropdown hover with grace, click-outside, ESC ──
  const openDropdown = (type: IconDropdown) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setActiveDropdown(type);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rightRef.current && !rightRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setMegaOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Esc closes the mobile sheet too. Separate listener so it fires even
  // when the sheet has captured focus and the click-outside handler above
  // would short-circuit on the backdrop.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while the sheet is open so the page underneath
    // doesn't scroll behind a fullscreen overlay.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // Bfcache safety net. When the user navigates away (sheet maybe still
  // open) and presses browser-back, modern browsers restore the page from
  // bfcache: DOM frozen as-is, React state preserved, effects paused.
  // That means `body.style.overflow="hidden"` and stale dropdown state
  // can come back with the page, leaving the user with a frozen, click-
  // dead surface. `pageshow` with `persisted: true` is the canonical hook
  // for this — reset every piece of UI-only state so the page reads as
  // fresh after restore.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setSheetOpen(false);
      setSheetExpanded(null);
      setMegaOpen(null);
      setActiveDropdown(null);
      // Clear any leftover scroll lock — the close handlers above may
      // have run during pagehide but inline styles can persist on
      // restore in some browsers (Safari especially).
      document.body.style.overflow = '';
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (megaTimer.current) clearTimeout(megaTimer.current);
    },
    [],
  );

  // ─── Viewport-collision adjustment ────────────────────────
  // Same trick the blog uses: nudge the active dropdown by setting
  // `--dropdown-shift` so it never spills off the right or left edge.
  useLayoutEffect(() => {
    if (!activeDropdown || !rightRef.current) return;
    const adjust = () => {
      const dropdown = rightRef.current?.querySelector(
        '[role="menu"]',
      ) as HTMLElement | null;
      if (!dropdown) return;
      dropdown.style.setProperty('--dropdown-shift', '0px');
      const rect = dropdown.getBoundingClientRect();
      const margin = 16;
      const overflowRight = rect.right - (window.innerWidth - margin);
      const overflowLeft = margin - rect.left;
      let shift = 0;
      if (overflowRight > 0) shift = -overflowRight;
      else if (overflowLeft > 0) shift = overflowLeft;
      dropdown.style.setProperty('--dropdown-shift', `${shift}px`);
    };
    adjust();
    window.addEventListener('resize', adjust);
    return () => window.removeEventListener('resize', adjust);
  }, [activeDropdown]);

  // Stripped-down chrome for the in-house /authorization (+ /registration)
  // screen: just the brand mark, the audience switch (which doubles as the
  // "go to b2b login" exit on this page), and the settings dropdown. No
  // nav, no support/apps icons, no auth CTAs (the page itself IS the auth
  // CTA). The mobile sheet is also dropped — the only switchable controls
  // already fit at any width.
  if (isAuthPage) {
    return (
      <header className={`${styles.header} ${styles.headerMinimal}`} role="banner">
        <div className={styles.bar}>
          <div className={styles.brand}>
            <a href={homePath} className={styles.logo} aria-label="changenow home">
              <ChangeNowLogo />
            </a>
            <div className={`switch ${mode === 'business' ? 'b2b' : ''}`} role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'personal'}
                onClick={() => setMode('personal')}
              >
                Personal
              </button>
              <button
                role="tab"
                aria-selected={mode === 'business'}
                onClick={() => setMode('business')}
              >
                Business
              </button>
            </div>
          </div>
          <div className={styles.right} ref={rightRef}>
            <div
              className={`${styles.gradientWrapper} ${styles.roundGradientWrapper} ${
                activeDropdown === 'settings' ? styles.gradientWrapperActive : ''
              }`}
              onMouseEnter={() => openDropdown('settings')}
              onMouseLeave={scheduleClose}
            >
              <button
                className={styles.brilliantButton}
                onClick={() => openDropdown('settings')}
                onFocus={() => openDropdown('settings')}
                type="button"
                aria-label="Settings"
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'settings'}
              >
                <SettingsIcon />
              </button>
              {activeDropdown === 'settings' && <SettingsDropdown locale={locale} />}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={styles.header} role="banner">
      <div className={styles.bar}>
        {/* Logo + audience switch live together so they hug each other and
            the rest of the bar can space evenly around them. */}
        <div className={styles.brand}>
          {/* Local home — keep navigation inside this app. The legacy site
              root lives at lib/config SITE_URL and is reserved for the
              footer / exchange-deep-link surfaces. The href carries the
              active locale prefix so /ru/* lands back on /ru, not English.

              The optional section badge below is a SEPARATE anchor — never
              nested inside this one — so each click target has its own
              destination, focus ring, and middle-click behaviour. Mirrors
              the blog's `[Logo][Blog]` pattern but split apart for a11y. */}
          <a
            href={homePath}
            className={styles.logo}
            aria-label="changenow home"
          >
            <ChangeNowLogo />
          </a>
          {badge && badgeHref && (
            <a href={badgeHref} className={styles.logoBadge}>
              {badge.label}
            </a>
          )}
          <div className={`switch ${mode === 'business' ? 'b2b' : ''}`} role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'personal'}
              onClick={() => setMode('personal')}
            >
              Personal
            </button>
            <button
              role="tab"
              aria-selected={mode === 'business'}
              onClick={() => setMode('business')}
            >
              Business
            </button>
          </div>
        </div>

        {/* Homepage-only: product mega-menu (the blog has CategoryNav here) */}
        <nav className="nav" onMouseLeave={scheduleMegaClose}>
          {navItems.map((it) => (
            <button
              key={it.id}
              className={`nav-item ${megaOpen === it.id ? 'active' : ''}`}
              onMouseEnter={() => openMega(it.id)}
              onFocus={() => openMega(it.id)}
              onClick={() => setMegaOpen(megaOpen === it.id ? null : it.id)}
              aria-expanded={megaOpen === it.id}
              aria-haspopup="menu"
            >
              <span>{it.label}</span>
              <svg
                width="9"
                height="9"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                style={{
                  marginLeft: 5,
                  opacity: 0.55,
                  transition: 'transform 200ms',
                  transform: megaOpen === it.id ? 'rotate(180deg)' : 'none',
                }}
              >
                <path
                  d="M3 4.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </nav>

        {/* Shared with blog: icon-button cluster + auth + settings */}
        <div className={styles.right} ref={rightRef}>
          <div className={styles.iconButtonsWrapper}>
            <div
              className={`${styles.gradientWrapper} ${
                activeDropdown === 'headphones' ? styles.gradientWrapperActive : ''
              }`}
              onMouseEnter={() => openDropdown('headphones')}
              onMouseLeave={scheduleClose}
            >
              <button
                className={styles.iconButton}
                onClick={() => openDropdown('headphones')}
                onFocus={() => openDropdown('headphones')}
                type="button"
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'headphones'}
                aria-label="Support"
              >
                <HeadphonesIcon />
              </button>
              {activeDropdown === 'headphones' && (
                <HeadphonesDropdown dict={dict} locale={locale} />
              )}
            </div>
            <div
              className={`${styles.gradientWrapper} ${
                activeDropdown === 'apps' ? styles.gradientWrapperActive : ''
              }`}
              onMouseEnter={() => openDropdown('apps')}
              onMouseLeave={scheduleClose}
            >
              <button
                className={styles.iconButton}
                onClick={() => openDropdown('apps')}
                onFocus={() => openDropdown('apps')}
                type="button"
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'apps'}
                aria-label="Apps"
              >
                <AppsIcon />
              </button>
              {activeDropdown === 'apps' && (
                <AppsDropdown
                  dict={dict}
                  locale={locale}
                  apkAndroidUrl={apkAndroidUrl}
                  mobileAppsUrl={mobileAppsUrl}
                />
              )}
            </div>
          </div>
          {isLoggedIn ? (
            <div
              className={styles.myAccountWrapper}
              onMouseEnter={() => openDropdown('account')}
              onMouseLeave={scheduleClose}
            >
              {/* Primary "My Account" CTA — a real anchor to /pro/balance so
                  middle-click / Cmd-click open in a new tab, and so the
                  caret button next to it doesn't double-fire navigation on
                  hover-open. */}
              <a
                href={`${CN_SITE_URL}/pro/balance`}
                className={`${styles.authButton} ${styles.authButtonGreen} ${styles.myAccountPrimary}`}
              >
                My Account
              </a>
              {/* Hairline slot painted in header-bg so the green CTA and the
                  grey chevron read as one pill split into two halves. */}
              <span className={styles.myAccountDivider} aria-hidden="true" />
              <button
                type="button"
                className={styles.myAccountCaret}
                onClick={() =>
                  setActiveDropdown((cur) => (cur === 'account' ? null : 'account'))
                }
                onFocus={() => openDropdown('account')}
                aria-haspopup="menu"
                aria-expanded={activeDropdown === 'account'}
                aria-label="Open account menu"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                  style={{
                    transition: 'transform 180ms',
                    transform: activeDropdown === 'account' ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <path
                    d="M3 4.5l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {activeDropdown === 'account' && (
                <AccountDropdown
                  email={session?.email ?? null}
                  onSignOut={signOut}
                  localePrefix={localePrefix}
                />
              )}
            </div>
          ) : (
            <div className={styles.authButtonsWrapper}>
              <a
                href={authLinks.signup}
                className={`${styles.authButton} ${
                  mode === 'business' ? styles.authButtonBlue : styles.authButtonGreen
                }`}
              >
                Sign Up
              </a>
              <a href={authLinks.login} className={styles.authButton}>
                Log In
              </a>
            </div>
          )}
          <div
            className={`${styles.gradientWrapper} ${styles.roundGradientWrapper} ${
              activeDropdown === 'settings' ? styles.gradientWrapperActive : ''
            }`}
            onMouseEnter={() => openDropdown('settings')}
            onMouseLeave={scheduleClose}
          >
            <button
              className={styles.brilliantButton}
              onClick={() => openDropdown('settings')}
              onFocus={() => openDropdown('settings')}
              type="button"
              aria-label="Settings"
              aria-haspopup="menu"
              aria-expanded={activeDropdown === 'settings'}
            >
              <SettingsIcon />
            </button>
            {activeDropdown === 'settings' && <SettingsDropdown locale={locale} />}
          </div>
        </div>

        {/* Mobile cluster — only visible below the desktop breakpoint.
            Holds a single Sign-Up CTA (or Dashboard when logged in) and
            the hamburger toggle, side by side. Personal/Business switch
            doesn't live here — it's exposed inside the slide-in sheet. */}
        <div className={styles.mobileCluster}>
          {isLoggedIn ? (
            <a
              href={`${CN_SITE_URL}/pro/balance`}
              className={`${styles.mobileSignup} ${styles.authButtonGreen}`}
            >
              My Account
            </a>
          ) : (
            <a
              href={authLinks.signup}
              className={`${styles.mobileSignup} ${
                mode === 'business' ? styles.authButtonBlue : styles.authButtonGreen
              }`}
            >
              Sign Up
            </a>
          )}
          <button
            type="button"
            className={styles.hamburger}
            aria-label="Open menu"
            aria-expanded={sheetOpen}
            aria-controls="header-sheet"
            onClick={() => setSheetOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile sheet — overlay + drawer. Always rendered so the
          slide-in transform animates rather than abruptly mounting. */}
      <div
        className={`${styles.sheetBackdrop} ${sheetOpen ? styles.sheetBackdropOpen : ''}`}
        onClick={() => setSheetOpen(false)}
        aria-hidden={!sheetOpen}
      />
      <aside
        id="header-sheet"
        className={`${styles.sheet} ${sheetOpen ? styles.sheetOpen : ''}`}
        aria-hidden={!sheetOpen}
        // Tab trap is light — focus-visible works inside the sheet, and
        // Esc closes it (handled in the effect above).
      >
        <div className={styles.sheetHeader}>
          <div className={`switch ${mode === 'business' ? 'b2b' : ''}`} role="tablist">
            <button role="tab" aria-selected={mode === 'personal'} onClick={() => setMode('personal')}>
              Personal
            </button>
            <button role="tab" aria-selected={mode === 'business'} onClick={() => setMode('business')}>
              Business
            </button>
          </div>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={styles.sheetBody}>
          {isLoggedIn ? (
            <div className={styles.sheetAuthRow}>
              <a
                href={`${CN_SITE_URL}/pro/balance`}
                className={`${styles.sheetItem} ${styles.sheetItemPrimary}`}
              >
                My Account
              </a>
            </div>
          ) : (
            <div className={styles.sheetAuthRow}>
              <a href={authLinks.login} className={styles.sheetItem}>
                Log In
              </a>
              <a
                href={authLinks.signup}
                className={`${styles.sheetItem} ${styles.sheetItemPrimary} ${
                  mode === 'business' ? styles.sheetItemPrimaryBlue : ''
                }`}
              >
                Sign Up
              </a>
            </div>
          )}
          <div className={styles.sheetGroup}>
            <p className={styles.sheetGroupTitle}>Products</p>
            {navItems.map((it) => {
              const cfg = MEGA_MENU[it.id];
              const expanded = sheetExpanded === it.id;
              return (
                <div key={it.id}>
                  <button
                    type="button"
                    className={`${styles.sheetItem} ${expanded ? styles.sheetItemOpen : ''}`}
                    aria-expanded={expanded}
                    onClick={() => setSheetExpanded(expanded ? null : it.id)}
                  >
                    <span>{it.label}</span>
                    <svg className={styles.sheetCaret} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {expanded && cfg && (
                    <div className={styles.sheetSubmenu}>
                      {cfg.sections.flatMap((s) =>
                        s.kind === 'highlights'
                          ? s.items.map((hl) => (
                              <a key={hl.title} href={hl.href} className={styles.sheetSubItem}>
                                {hl.title}
                              </a>
                            ))
                          : s.items.map((sub) => (
                              <a key={sub.label} href={sub.href} className={styles.sheetSubItem}>
                                {sub.label}
                              </a>
                            )),
                      )}
                      <a href={cfg.footHref} className={styles.sheetSubItem}>
                        {cfg.foot} →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {megaOpen && (
        <div
          className="mm-anchor"
          onMouseEnter={cancelMegaClose}
          onMouseLeave={scheduleMegaClose}
        >
          <MegaMenu id={megaOpen} mode={mode} />
        </div>
      )}
    </header>
  );
}
