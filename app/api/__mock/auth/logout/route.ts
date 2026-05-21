import { gateMocks, withState } from '../../_shared';

export async function POST() {
  const gate = gateMocks();
  if (gate) return gate;
  // Logout always succeeds and clears every server-side auth cookie. Real
  // upstream is allowed to 5xx; the client treats logout as best-effort.
  return withState({ ok: true }, { status: 200 }, null);
}
