'use client';

import { useEffect, useState } from 'react';

import { createT, type TranslationDict } from '@/lib/i18n/createT';

import styles from './CookieWarning.module.css';

/**
 * Cookie-consent banner. Ported from the legacy
 * `cn-ui-kit/src/components/cookie-warning/cookie-warning.tsx`. The DOM
 * shape and copy keys (`COOKIE.COOKIES_ALL_TEXT` for the body HTML,
 * `COOKIE.COOKIES_ACCEPT` for the button) are unchanged so the translation
 * dictionaries don't need a new pass.
 *
 * Differences from legacy:
 *   - Visuals reskinned with the app's design tokens (`--paper-2`, `--ink`,
 *     `--accent`, …) so the card auto-themes between light and dark, vs the
 *     legacy hard-coded `#E5E5E9` light-only treatment.
 *   - Cookie key is namespaced `chn-cookie-consent-v3` to keep the legacy
 *     `cookie-warning-shown-v2` cookie from cross-talking — users with the
 *     old cookie still see the banner once in the new app and can dismiss
 *     it on its own terms.
 *   - SSR-safe: the banner starts hidden and the cookie read happens in an
 *     effect, so the server-rendered markup stays consistent across all
 *     visitors and there's no consent-state hydration mismatch.
 */

const COOKIE_NAME = 'chn-cookie-consent-v3';
// One year — the same window the legacy widget used.
const COOKIE_TTL_DAYS = 365;
// Short delay before the banner appears so it doesn't fight the first
// paint of the hero / above-the-fold content.
const APPEAR_DELAY_MS = 800;

const hasConsent = (): boolean => {
  if (typeof document === 'undefined') return true;
  // Plain document.cookie read — no `js-cookie` dependency. Matches the
  // legacy semantics (presence = accepted; value content unused).
  return document.cookie
    .split(';')
    .some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
};

const writeConsent = (): void => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_TTL_DAYS);
  // SameSite=Lax so the cookie is sent on top-level GETs (including a
  // fresh tab opened from an external link) but stays out of third-party
  // contexts. Secure is implied by the prod HTTPS host; in dev (http) the
  // attribute would be ignored anyway, so we always include it.
  document.cookie =
    `${COOKIE_NAME}=1; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
};

interface Props {
  dict: TranslationDict;
}

export function CookieWarning({ dict }: Props) {
  const t = createT(dict);
  // `mounted` controls whether the dialog is in the DOM at all (so it can be
  // unmounted post-accept without an empty fixed container intercepting any
  // pointer events). `visible` toggles the CSS class that drives the slide-
  // in transform — must be flipped *after* `mounted` has committed so the
  // transition starts from the off-screen state rather than skipping straight
  // to the visible one.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasConsent()) return;
    const mountId = window.setTimeout(() => setMounted(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(mountId);
  }, []);

  // Separate effect so the `visible` flip runs in its own commit, one frame
  // after `mounted` toggles. Coupling it to `mounted` via a state-setter
  // chain inside the first effect collapses both updates into one batched
  // render (React 19 + Next 16), and the transition never gets a chance to
  // start from `translateY(120%)`.
  useEffect(() => {
    if (!mounted) return;
    const id = window.setTimeout(() => setVisible(true), 16);
    return () => window.clearTimeout(id);
  }, [mounted]);

  if (!mounted) return null;

  const onAccept = () => {
    writeConsent();
    setVisible(false);
    // Match the 280ms slide-out so the unmount happens after the
    // transition completes — no popping.
    window.setTimeout(() => setMounted(false), 320);
  };

  // The text is shipped as HTML (links to /terms-of-use, /privacy-policy
  // baked into the translation), same as legacy. The dictionary value is
  // editorial, not user-controlled, so dangerouslySetInnerHTML is safe.
  const html = t('COOKIE.COOKIES_ALL_TEXT') as string;
  const accept = t('COOKIE.COOKIES_ACCEPT') as string;

  return (
    <div
      className={`${styles.root} ${visible ? styles.visible : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div className={styles.card}>
        <div
          className={styles.text}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <button
          type="button"
          className={styles.button}
          onClick={onAccept}
          data-ga-category="cookie-consent"
          data-ga-action="accept-click"
        >
          {accept}
        </button>
      </div>
    </div>
  );
}
