import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';

import { AUTH_MOCKS_ENABLED } from '../config';
import type { UserSession } from './dal';

// Server-side `getSession()` for layouts and pages. Hits the upstream
// directly with the request's cookies — same upstream the client DAL talks
// to, just from the server side on first paint.
//
// The result is `react.cache`-d per render, so a layout, a server component,
// and a page that all call `getSession()` cost one upstream round-trip.
//
// Why no localStorage flag like legacy: see edge case E3 in the migration
// plan. The single source of truth is the upstream's view of the cookie.
//
// When `AUTH_MOCKS_ENABLED` is set we short-circuit and read the dev-only
// `__mock_auth_state` cookie locally instead of round-tripping anywhere —
// the upstream would 401 every request in that mode anyway because the
// real session cookie is missing.

const UPSTREAM_BASE_URL =
  process.env.DASHBOARD_API_BASE_URL ?? 'https://vip-api.bento.capital';

const MOCK_USER: UserSession = {
  id: 'mock-user-id',
  email: 'mock@changenow.local',
  kycLevel: 2,
  transactions: 12,
  sumsubStatus: 'GREEN',
  sumsubUpdatedAt: null,
  sumsubCountries: [],
  balances: [],
  isTwoFactorEnabled: false,
  address: null,
  subscription: { amlChecksLimit: 0, level: null, nextBillingAt: null, status: null },
  custody: { isActive: false, partnerId: null, email: null },
  settings: {},
  isUserEmailNotConfirmed: false,
};

const SESSION_TIMEOUT_MS = 5_000;

const mapMe = (raw: unknown): UserSession => {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sub = (r.subscription ?? {}) as Record<string, unknown>;
  const cust = (r.custody ?? {}) as Record<string, unknown>;
  const settings = (r.settings ?? {}) as Record<string, unknown>;
  const email = (r.email as string | null) ?? null;
  const kycLevel = (r.kycLevel as number | undefined) ?? 0;
  const address = (r.address as string | null) ?? null;
  const isUserEmailNotConfirmed =
    Boolean(email && !(kycLevel > 0)) || Boolean(!email && address);
  return {
    id: (r.id as string | null) ?? null,
    email,
    kycLevel,
    transactions: (r.transactions as number | undefined) ?? 0,
    sumsubStatus: (r.sumsubStatus as string | null) ?? null,
    sumsubUpdatedAt: (r.sumsubUpdatedAt as string | null) ?? null,
    sumsubCountries: (r.sumsubCountries as string[] | undefined) ?? [],
    balances: (r.balances as unknown[] | undefined) ?? [],
    isTwoFactorEnabled: (r.isTwoFactorEnabled as boolean | undefined) ?? false,
    address,
    subscription: {
      amlChecksLimit: (sub.amlChecksLimit as number | undefined) ?? 0,
      level: sub.level ?? null,
      nextBillingAt: (sub.nextBillingAt as string | null) ?? null,
      status: (sub.status as string | null) ?? null,
    },
    custody: {
      isActive: (cust.isActive as boolean | undefined) ?? false,
      partnerId: (cust.partnerId as string | null) ?? null,
      email: (cust.email as string | null) ?? null,
    },
    settings: {
      notifyExchange: settings.notifyExchange as boolean | undefined,
      notifyExchangePro: settings.notifyExchangePro as boolean | undefined,
    },
    isUserEmailNotConfirmed,
  };
};

export const getSession = cache(async (): Promise<UserSession | null> => {
  // Mock-flag short-circuit. The dev cookie-state switcher writes
  // `__mock_auth_state=valid` to mark an authed session; any other value
  // (or its absence) reads as guest.
  if (AUTH_MOCKS_ENABLED) {
    const jar = await cookies();
    const v = jar.get('__mock_auth_state')?.value;
    return v === 'valid' ? MOCK_USER : null;
  }

  const h = await headers();
  const cookie = h.get('cookie');
  if (!cookie) return null; // Definitely guest — no need to round-trip.

  const fwdHeaders: Record<string, string> = {
    Accept: 'application/json',
    Cookie: cookie,
  };

  let res: Response;
  try {
    res = await fetch(`${UPSTREAM_BASE_URL}/users/me`, {
      method: 'GET',
      headers: fwdHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
  } catch {
    // Network failure on session check — treat as guest. Safer than 5xx-ing
    // the entire page; the user can still log in.
    return null;
  }

  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) return null;

  const body = await res.json().catch(() => null);
  if (!body) return null;
  return mapMe(body);
});
