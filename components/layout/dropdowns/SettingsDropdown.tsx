'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/config';
import { LABELS } from '@/app/utils/constants/langs';
import { useLocalizedPath } from '../LocalizedPathContext';

import navStyles from './dropdowns.module.css';
import styles from './SettingsDropdown.module.css';

type View = 'main' | 'languages';
type Resolved = 'light' | 'dark';

const LOCALE_PATTERN = /^\/([a-z]{2,3})(?=\/|$)/;

const swapLocale = (pathname: string, target: Locale): string => {
  const stripped = pathname.replace(LOCALE_PATTERN, '') || '/';
  return target === DEFAULT_LOCALE ? stripped : `/${target}${stripped}`;
};

const blogHomeFor = (target: Locale): string =>
  target === DEFAULT_LOCALE ? '/blog' : `/${target}/blog`;

const getResolvedTheme = (): Resolved => {
  if (typeof document === 'undefined') return 'light';
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark' || explicit === 'light') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// `useSyncExternalStore` subscription: re-emits the current resolved theme
// whenever the OS color-scheme preference flips. Reading the html attribute
// directly inside `getSnapshot` keeps us in sync with the inline bootstrap
// script and the `toggleTheme` mutation below — no setState-in-effect.
const subscribeToColorScheme = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
};

interface Props {
  locale: Locale;
}

export default function SettingsDropdown({ locale }: Props) {
  const [view, setView] = useState<View>('main');
  // Server snapshot returns `null` so the initial render matches whatever
  // the document has not yet received from the inline bootstrap; the actual
  // value comes in on the client mount tick.
  const theme = useSyncExternalStore<Resolved | null>(
    subscribeToColorScheme,
    getResolvedTheme,
    () => null,
  );
  const [, forceTick] = useState(0);

  const router = useRouter();
  const pathname = usePathname();
  const urlForLocale = useLocalizedPath();
  const hasAnnouncement = Object.keys(urlForLocale).length > 0;

  const toggleTheme = () => {
    const next: Resolved = getResolvedTheme() === 'dark' ? 'light' : 'dark';
    // Mirror the attribute onto <html> and <body> so CSS targeting either
    // selector picks it up — globals.css uses `body[data-theme=…]`,
    // dropdown/header tokens use `:root[data-theme=…]`.
    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode / quota — best effort */
    }
    // `useSyncExternalStore` only re-runs when the subscribed-to source
    // emits — the html attribute mutation above is silent, so nudge a
    // re-render explicitly.
    forceTick((n) => n + 1);
  };

  const resolveLocaleUrl = (target: Locale): string => {
    if (!hasAnnouncement) return swapLocale(pathname, target);
    return urlForLocale[target] ?? blogHomeFor(target);
  };

  return (
    <div className={`${navStyles.dropdown} ${styles.settingsDropdown}`} role="menu">
      {view === 'main' ? (
        <>
          <button
            type="button"
            className={styles.row}
            onClick={() => setView('languages')}
          >
            <span>Language</span>
            <span className={styles.rowMeta}>
              <span>{LABELS[locale].name}</span>
              <ChevronRight className={styles.chevron} />
            </span>
          </button>

          <button
            type="button"
            className={styles.row}
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
          >
            <span>Theme</span>
            <span className={styles.themeIndicator} aria-hidden="true">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setView('main')}
          >
            <ChevronLeft />
            <span>Back</span>
          </button>
          <ul className={styles.langList}>
            {LOCALES.map((l) => {
              const selected = l === locale;
              return (
                <li key={l}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`${styles.langItem} ${selected ? styles.active : ''}`}
                    onClick={() => router.push(resolveLocaleUrl(l))}
                  >
                    <span className={styles.langName}>{LABELS[l].name}</span>
                    {selected && <Checkmark className={styles.checkmark} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkmark({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className={styles.themeIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className={styles.themeIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
