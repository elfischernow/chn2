'use client';

import { useEffect, useState } from 'react';

import { getMe, type UserSession } from './dal';

interface SessionState {
  session: UserSession | null;
  isLoading: boolean;
}

let cached: { session: UserSession | null; promise: Promise<UserSession | null> } | null = null;

function fetchSession(): Promise<UserSession | null> {
  if (cached) return cached.promise;
  const promise = getMe()
    .then((r) => {
      const s = r.isError ? null : (r.data as UserSession);
      cached = { session: s, promise };
      return s;
    })
    .catch(() => {
      cached = { session: null, promise };
      return null;
    });
  cached = { session: null, promise };
  return promise;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => ({
    session: cached?.session ?? null,
    isLoading: !cached?.session,
  }));

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((session) => {
      if (!cancelled) setState({ session, isLoading: false });
    });
    return () => { cancelled = true; };
  }, []);

  return state;
}
