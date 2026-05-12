'use client';

import { useSyncExternalStore } from 'react';

export type HeaderMode = 'personal' | 'business';

const STORAGE_KEY = 'chn:header-mode';
const EVENT_NAME = 'chn:header-mode-change';

function readStored(): HeaderMode {
  if (typeof window === 'undefined') return 'personal';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'business' ? 'business' : 'personal';
  } catch {
    return 'personal';
  }
}

function subscribe(cb: () => void) {
  const onChange = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function broadcast() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

/**
 * Shared Personal/Business switch state. Persists across navigations via
 * localStorage, syncs across all mounted consumers (header + pages that
 * pin the mode like /for-partners) via a CustomEvent + the native
 * `storage` event for cross-tab sync. SSR-safe via `useSyncExternalStore`:
 * the server snapshot is always `personal`, then the client snapshot
 * upgrades from storage on mount.
 */
export function useHeaderMode(): [HeaderMode, (next: HeaderMode) => void] {
  const mode = useSyncExternalStore(
    subscribe,
    readStored,
    () => 'personal' as HeaderMode,
  );

  const update = (next: HeaderMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / quota — broadcast is enough for in-tab sync */
    }
    broadcast();
  };

  return [mode, update];
}

/** Fire-and-forget setter for pages that want to pin a mode on mount. */
export function setHeaderMode(next: HeaderMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  broadcast();
}
