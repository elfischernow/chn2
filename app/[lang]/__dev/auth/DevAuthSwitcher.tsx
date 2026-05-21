'use client';

import { useEffect, useState } from 'react';

import { LOGOUT_STORAGE_KEYS, REFRESH_TOKEN_KEY, USER_ID_KEY } from '@/lib/auth/constants';
import { _resetSessionCache } from '@/lib/auth/useSession';

type State = 'valid' | 'access-expired' | 'refresh-expired' | 'anonymous';

interface Row {
  state: State;
  title: string;
  desc: string;
}

const ROWS: Row[] = [
  {
    state: 'valid',
    title: 'Authenticated',
    desc:
      'Access + refresh tokens both valid. /users/me returns the mock user; the header shows the "My account" cluster with the Pro menu.',
  },
  {
    state: 'access-expired',
    title: 'Access token expired',
    desc:
      '/users/me returns 401. /auth/refresh succeeds and rotates the cookie back to "valid", so the next /me call returns the user. The header should briefly show the loading state, then the My-account cluster.',
  },
  {
    state: 'refresh-expired',
    title: 'Refresh token expired',
    desc:
      'Both /me and /auth/refresh return 401. The session is cleared and the header falls back to Sign Up / Log In.',
  },
  {
    state: 'anonymous',
    title: 'Signed out',
    desc: 'No cookies set. Same UX as a fresh visitor — Sign Up / Log In in the header.',
  },
];

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export function DevAuthSwitcher() {
  const [active, setActive] = useState<State>('anonymous');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = readCookie('__mock_auth_state');
    setActive((v as State) ?? 'anonymous');
  }, []);

  const apply = async (next: State) => {
    setBusy(true);
    try {
      await fetch(`/api/__mock/__set?state=${encodeURIComponent(next)}`, { method: 'POST' });
      // Keep the legacy localStorage in sync with the cookie. The legacy
      // SPA reads `refresh-token` / `uid` on boot to decide whether to
      // probe `/users/me`; if we only set the cookie, anything that lands
      // on a legacy page (e.g. /pro/balance via deep-link) will sign the
      // user out on first render. Mirror what the real signin flow would
      // write — bogus values are fine because the legacy code only checks
      // presence, not contents, before kicking off the auth probe.
      if (typeof window !== 'undefined') {
        if (next === 'anonymous' || next === 'refresh-expired') {
          for (const key of LOGOUT_STORAGE_KEYS) {
            try { window.localStorage.removeItem(key); } catch { /* ignore */ }
          }
        } else {
          try {
            window.localStorage.setItem(REFRESH_TOKEN_KEY, 'mock-refresh-token');
            window.localStorage.setItem(USER_ID_KEY, 'mock-user-id');
          } catch { /* private browsing — silently ignore */ }
        }
      }
      _resetSessionCache(null); // force every useSession subscriber to re-fetch
      setActive(next);
      // Tiny delay so the cookie write is observable in /me before reload.
      setTimeout(() => window.location.reload(), 80);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '64px auto',
        padding: '0 20px',
        fontFamily: 'var(--chn-font-sans), system-ui',
        color: 'var(--ink)',
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Auth state switcher</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28, lineHeight: 1.5 }}>
        Flips the <code>__mock_auth_state</code> cookie that the
        <code> /api/__mock/* </code> handlers read. Active only because
        <code> NEXT_PUBLIC_AUTH_MOCKS=true</code> was set at build time.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {ROWS.map((r) => {
          const on = r.state === active;
          return (
            <button
              key={r.state}
              type="button"
              disabled={busy}
              onClick={() => apply(r.state)}
              style={{
                textAlign: 'left',
                padding: '18px 20px',
                borderRadius: 14,
                background: on ? 'var(--accent-soft, #E6F9F1)' : 'var(--paper)',
                border: `1px solid ${on ? 'var(--accent, #00C26F)' : 'var(--line, #E5E5E9)'}`,
                cursor: busy ? 'not-allowed' : 'pointer',
                color: 'inherit',
                font: 'inherit',
                opacity: busy ? 0.6 : 1,
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <strong style={{ fontSize: 18 }}>{r.title}</strong>
                {on && <span style={{ fontSize: 12, color: 'var(--accent-hover, #00A451)', fontWeight: 600 }}>active</span>}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                {r.desc}
              </p>
            </button>
          );
        })}
      </div>
      <p style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-3)' }}>
        Quick verification: open the homepage in another tab, click a state, and watch the
        header swap between the My-account cluster and the Sign Up / Log In pair without a
        rebuild.
      </p>
    </main>
  );
}
