import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_MOCKS_ENABLED } from '@/lib/config';

/**
 * Single cookie that drives every mock-auth route. We keep it to one value
 * (vs. a pair of access + refresh cookies) because the real-world refresh
 * dance is fully captured by these four states and the simpler shape makes
 * the dev switcher page trivial.
 *
 *   valid           → /me returns the mock user, /refresh rotates fine
 *   access-expired  → /me returns 401, /refresh succeeds and flips state to "valid"
 *   refresh-expired → /me returns 401, /refresh returns 401 (clears cookie)
 *   <unset>         → anonymous
 */
export const MOCK_COOKIE = '__mock_auth_state';
export type MockState = 'valid' | 'access-expired' | 'refresh-expired';

/**
 * Hard-stop every mock route in production-style builds where the flag is
 * off. Returns the gate response (404) or `null` if the request may proceed.
 */
export function gateMocks(): NextResponse | null {
  if (AUTH_MOCKS_ENABLED) return null;
  return new NextResponse('Not Found', { status: 404 });
}

export async function readState(): Promise<MockState | null> {
  const jar = await cookies();
  const v = jar.get(MOCK_COOKIE)?.value;
  if (v === 'valid' || v === 'access-expired' || v === 'refresh-expired') return v;
  return null;
}

/** Helper to issue a NextResponse that also sets / clears the mock cookie. */
export function withState(
  body: unknown,
  init: ResponseInit,
  state: MockState | null,
): NextResponse {
  const res = NextResponse.json(body, init);
  if (state) {
    res.cookies.set(MOCK_COOKIE, state, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // dev page reads it for the active-state indicator
      maxAge: 60 * 60 * 24, // 1 day
    });
  } else {
    res.cookies.set(MOCK_COOKIE, '', { path: '/', maxAge: 0 });
  }
  return res;
}

/**
 * Stable mock user. Email drives the dropdown label; `custody.partnerId`
 * is what the Zendesk widget reads for its userId field; `balances` is
 * what the Pro balance preview / Pro menu uses to decide whether to show
 * the "you have funds" badge. A short non-empty list is more useful than
 * an empty one for any consumer that hides its widgets when zero.
 */
export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'mock@changenow.local',
  kycLevel: 2,
  transactions: 12,
  sumsubStatus: 'GREEN',
  sumsubUpdatedAt: null,
  sumsubCountries: [],
  balances: [
    { ticker: 'btc', amount: '0.42', amountUsd: '28140.00', network: 'btc' },
    { ticker: 'usdt', amount: '1850.00', amountUsd: '1850.00', network: 'trx' },
    { ticker: 'eth', amount: '2.1', amountUsd: '7320.50', network: 'eth' },
  ],
  isTwoFactorEnabled: false,
  address: null,
  subscription: { amlChecksLimit: 12, level: 'plus', nextBillingAt: null, status: 'active' },
  custody: { isActive: true, partnerId: 'mock-partner-id', email: 'mock@changenow.local' },
  settings: { notifyExchange: true, notifyExchangePro: true },
} as const;
