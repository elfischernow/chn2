import { gateMocks, readState, withState } from '../../_shared';

export async function POST() {
  const gate = gateMocks();
  if (gate) return gate;

  const state = await readState();
  // Refresh succeeds for `valid` and `access-expired` — both still hold a
  // live refresh cookie in the real upstream. State flips to `valid` so the
  // next /me call returns the user.
  if (state === 'valid' || state === 'access-expired') {
    return withState(
      { accessToken: 'mock-access', refreshToken: 'mock-refresh' },
      { status: 200 },
      'valid',
    );
  }
  // refresh-expired (or anonymous) — clear the cookie and return 401 so the
  // caller falls back to the unauthenticated view.
  return withState({ errorData: 'Refresh expired', status: 401 }, { status: 401 }, null);
}
