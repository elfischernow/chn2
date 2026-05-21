import type { NextRequest } from 'next/server';

import { gateMocks, type MockState, withState } from '../_shared';

const VALID_STATES = new Set<MockState>(['valid', 'access-expired', 'refresh-expired']);

/**
 * Dev-only endpoint the cookie-state switcher page calls. Flips the
 * `__mock_auth_state` cookie to the requested value (or clears it for the
 * anonymous case). Lives behind the same flag gate as the rest of /__mock.
 */
export async function POST(req: NextRequest) {
  const gate = gateMocks();
  if (gate) return gate;

  const url = new URL(req.url);
  const s = url.searchParams.get('state');
  if (s === null || s === 'anonymous') {
    return withState({ ok: true, state: null }, { status: 200 }, null);
  }
  if (VALID_STATES.has(s as MockState)) {
    return withState({ ok: true, state: s }, { status: 200 }, s as MockState);
  }
  return withState({ error: 'unknown state' }, { status: 400 }, null);
}
