import { gateMocks, MOCK_USER, readState, withState } from '../../_shared';

export async function GET() {
  const gate = gateMocks();
  if (gate) return gate;

  const state = await readState();
  if (state === 'valid') {
    return withState(MOCK_USER, { status: 200 }, state);
  }
  // Both expired states and the anonymous case fail the /me call. The auth
  // DAL's refresh-retry then decides whether to recover via /auth/refresh.
  return withState(
    { errorData: 'Unauthorized', status: 401 },
    { status: 401 },
    state, // preserve current state — we don't auto-clear on a 401
  );
}
