'use client';

import { useCallback, useEffect, useState } from 'react';

import { LOGOUT_STORAGE_KEYS } from './constants';
import { getMeWithRefresh, logout as logoutCall, type UserSession } from './dal';

interface SessionState {
  session: UserSession | null;
  isLoading: boolean;
}

interface SessionActions {
  /**
   * Best-effort sign-out: hits `auth/logout` so the upstream clears its
   * cookies, then resets the in-memory cache to null so every `useSession`
   * subscriber re-renders without a session. The network call is fire-and-
   * forget — we don't block UX on the upstream's response.
   */
  signOut: () => Promise<void>;
}

// Module-scoped cache + subscriber set so multiple `useSession` mounts share
// one underlying fetch and react together when the session flips (e.g. after
// signOut() or a 401 retry that swung the answer).
let cached: { session: UserSession | null; promise: Promise<UserSession | null> } | null = null;
const subscribers = new Set<(s: UserSession | null) => void>();

function notify(session: UserSession | null) {
  subscribers.forEach((cb) => cb(session));
}

// Cross-tab sync. BroadcastChannel where supported (every browser since 2020),
// `storage` event as a fallback so the header CTA + calculator UI in a sibling
// tab flips to "guest" within a render frame instead of waiting for the next
// /users/me roundtrip.
const BROADCAST_NAME = 'cn-auth';
const STORAGE_PING_KEY = 'cn-auth:ping';
type CrossTabMessage =
  | { type: 'signed-out' }
  | { type: 'signed-in'; session: UserSession };
let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (broadcastChannel) return broadcastChannel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_NAME);
  } catch {
    return null;
  }
  return broadcastChannel;
}
function broadcast(message: CrossTabMessage) {
  const channel = getBroadcastChannel();
  if (channel) {
    try { channel.postMessage(message); } catch { /* ignore */ }
    return;
  }
  // Fallback: write+remove a storage key. Same-tab writes don't fire the
  // event; only other tabs do.
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PING_KEY, `${Date.now()}:${message.type}`);
    window.localStorage.removeItem(STORAGE_PING_KEY);
  } catch {
    /* ignore */
  }
}

function fetchSession(): Promise<UserSession | null> {
  if (cached) return cached.promise;
  const promise = getMeWithRefresh()
    .then((r) => {
      const s = r.isError ? null : (r.data as UserSession);
      cached = { session: s, promise };
      notify(s);
      return s;
    })
    .catch(() => {
      cached = { session: null, promise };
      notify(null);
      return null;
    });
  cached = { session: null, promise };
  return promise;
}

/** Force the cache to a known value — used by signOut + mocks dev page. */
export function _resetSessionCache(next: UserSession | null) {
  cached = { session: next, promise: Promise.resolve(next) };
  notify(next);
}

export function useSession(): SessionState & SessionActions {
  const [state, setState] = useState<SessionState>(() => ({
    session: cached?.session ?? null,
    isLoading: !cached,
  }));

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((session) => {
      if (!cancelled) setState({ session, isLoading: false });
    });
    const onChange = (session: UserSession | null) => {
      if (!cancelled) setState({ session, isLoading: false });
    };
    subscribers.add(onChange);

    // Cross-tab listener: when another tab logs out, drop our cached session
    // immediately. We avoid trusting `signed-in` messages — instead we re-
    // fetch /users/me on our own to keep this tab the source of truth for
    // its own session (sibling tabs might have a different cookie scope).
    const channel = getBroadcastChannel();
    const onCrossTab = (msg: CrossTabMessage) => {
      if (cancelled) return;
      if (msg.type === 'signed-out') {
        cached = { session: null, promise: Promise.resolve(null) };
        setState({ session: null, isLoading: false });
      } else if (msg.type === 'signed-in') {
        // A sibling tab signed in — re-resolve our own /users/me so cookies
        // shared on the same eTLD+1 promote us too. Don't reuse the message
        // payload directly: cookie reads are still per-tab authoritative.
        cached = null;
        fetchSession().then((session) => {
          if (!cancelled) setState({ session, isLoading: false });
        });
      }
    };
    const channelListener = (event: MessageEvent<CrossTabMessage>) => onCrossTab(event.data);
    const storageListener = (event: StorageEvent) => {
      if (event.key !== STORAGE_PING_KEY || !event.newValue) return;
      const [, type] = event.newValue.split(':');
      if (type === 'signed-out') onCrossTab({ type: 'signed-out' });
      else if (type === 'signed-in' && cached?.session) {
        onCrossTab({ type: 'signed-in', session: cached.session });
      }
    };
    channel?.addEventListener('message', channelListener);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', storageListener);
    }

    return () => {
      cancelled = true;
      subscribers.delete(onChange);
      channel?.removeEventListener('message', channelListener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', storageListener);
      }
    };
  }, []);

  const signOut = useCallback(async () => {
    // Fire-and-forget the upstream call — even if it 5xx's we still clear
    // the local cache so the user sees the unauthenticated UI immediately.
    try { await logoutCall(); } catch { /* swallow */ }
    // Wipe the legacy SPA's localStorage residue. Same keys the old frontend
    // wrote on login (refresh token, uid, balance UI state); leaving them
    // behind would let a stale tab "look" logged in until the next refresh.
    if (typeof window !== 'undefined') {
      for (const key of LOGOUT_STORAGE_KEYS) {
        try { window.localStorage.removeItem(key); } catch { /* ignore */ }
      }
    }
    _resetSessionCache(null);
    broadcast({ type: 'signed-out' });
  }, []);

  return { ...state, signOut };
}
