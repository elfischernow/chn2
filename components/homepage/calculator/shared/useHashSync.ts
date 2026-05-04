import { useEffect, useRef } from 'react';

interface UseHashSyncOptions {
  /** Apply hash params to component state. Called once on mount and again on every `hashchange`. */
  read: (params: URLSearchParams) => void;
  /** Build the canonical params from current component state. Return `null`
   *  when the state matches its defaults — the hook will clear both the hash
   *  and the `?mode=1` query flag in that case, so a fresh visit to `/`
   *  stays at `/`. Return non-null `URLSearchParams` for any non-default
   *  state; the hook serializes them into the hash and adds `?mode=1` to
   *  the search string as a "user has interacted" marker the server can
   *  use to skip the Suspense skeleton. */
  write: () => URLSearchParams | null;
  /** Dependency list mirroring the state values that should re-write the hash. */
  writeDeps: React.DependencyList;
}

/** Query-string key for the "user has interacted with state" marker.
 *  Distinct from the hash's own `mode=…` (which names the active tab) — the
 *  query lives where the server can read it during SSR. */
const STATE_FLAG_KEY = 'mode';
const STATE_FLAG_VALUE = '1';

/**
 * Two-way sync between component state and `window.location.hash` + a
 * `?mode=1` query flag.
 *
 * - On mount (and on every external `hashchange`) the hook calls `read` with
 *   the parsed params so the caller can dispatch its setters.
 * - After that first read settles, every change to `writeDeps` re-runs `write`
 *   and pushes the canonical URL via `replaceState`:
 *   - When `write` returns `null`, both the hash and the `?mode=1` flag are
 *     stripped — `/` stays `/`.
 *   - When `write` returns params, the hash is set to their string form and
 *     `?mode=1` is added (other query params are preserved).
 *   The first write is gated on the first read so a bookmarked state isn't
 *   clobbered by SSR defaults before it has a chance to apply.
 *
 * Both closures are tracked through refs so the listener attached on mount
 * always sees the latest setters/state without re-subscribing per render.
 */
export function useHashSync({ read, write, writeDeps }: UseHashSyncOptions) {
  const hashInitedRef = useRef(false);
  const readRef = useRef(read);
  const writeRef = useRef(write);

  useEffect(() => {
    readRef.current = read;
    writeRef.current = write;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (raw) readRef.current(new URLSearchParams(raw));
      hashInitedRef.current = true;
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  useEffect(() => {
    if (!hashInitedRef.current || typeof window === 'undefined') return;
    const params = writeRef.current();

    // Preserve any other query params (Next.js, analytics, partner attribution
    // etc.) — we only own the `mode=1` state-marker flag.
    const search = new URLSearchParams(window.location.search);
    if (params) search.set(STATE_FLAG_KEY, STATE_FLAG_VALUE);
    else search.delete(STATE_FLAG_KEY);

    const searchStr = search.toString();
    const hashStr = params ? `#${params.toString()}` : '';
    const target = `${window.location.pathname}${searchStr ? `?${searchStr}` : ''}${hashStr}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target !== current) {
      window.history.replaceState(null, '', target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, writeDeps);
}
