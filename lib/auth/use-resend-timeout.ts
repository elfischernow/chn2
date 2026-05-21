'use client';

// Unified resend-timer hook. Replaces the two independent timers in legacy
// (`timerNumber` 60s + `useResendTimeout` backoff) with one mechanism per
// flow, persisted to localStorage so refreshes don't reset the counter.
// Closes edge case E23 in docs/auth-migration-plan.md.
//
// Backoff rules — copied verbatim from
// legacy-projects/.../hooks/use-resend-timeout.ts:
//   attempt 1-3 → 60s window
//   attempt 4   → 600s (10 min)
//   attempt 5-9 → 3600s (1 hour)
//   attempt 10  → blocked for 24h after firstAttempt
//
// Caller passes a `flow` discriminator (`'register' | 'forgot' | '2fa-email'`)
// so each flow gets its own bucket — completing one flow doesn't clobber
// another's timer.

import { useCallback, useEffect, useState } from 'react';

import { RESEND_TIMEOUT } from './constants';

const SECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const SECONDS_IN_HOUR = 60 * 60 * 1000;
const SECONDS_IN_MINUTE = 60 * 1000;

interface StoredState {
  attempts: number;
  firstAttempt: number; // ms timestamp
  timerEnd: number; // ms timestamp; 0 = no active wait
}

const storageKey = (flow: string) => `${RESEND_TIMEOUT.STORAGE_KEY}:${flow}`;

const readStorage = (flow: string): StoredState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(flow));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (
      typeof parsed.attempts !== 'number' ||
      typeof parsed.firstAttempt !== 'number' ||
      typeof parsed.timerEnd !== 'number'
    ) {
      return null;
    }
    return parsed as StoredState;
  } catch {
    return null;
  }
};

const writeStorage = (flow: string, state: StoredState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(flow), JSON.stringify(state));
  } catch {
    // ignore
  }
};

const clearStorage = (flow: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(flow));
  } catch {
    // ignore
  }
};

/**
 * Free-function clear. Call from success handlers (signin/google/2FA) so the
 * backoff bucket doesn't leak across sessions — without this, a user who
 * exhausted their resends and then logged in via a different path comes back
 * to a throttled OTP screen.
 */
export const clearResendBuckets = (...flows: string[]): void => {
  for (const flow of flows) clearStorage(flow);
};

export interface UseResendTimeoutReturn {
  /** Seconds left before the user can resend again. 0 → resend allowed. */
  timeLeft: number;
  /** Number of resend attempts so far. */
  attempts: number;
  /** Total allowed attempts before block (10). */
  maxAttempts: number;
  /** Threshold past which we display "X attempts remaining" (7). */
  warningThreshold: number;
  /** True when attempts ≥ maxAttempts → user must contact support. */
  isBlocked: boolean;
  /** Trigger one resend cycle. Caller should also fire the actual API call. */
  beginAttempt: () => void;
  /** Manually clear the bucket — call after a successful auth. */
  clearTimeout: () => void;
}

export function useResendTimeout(flow: string): UseResendTimeoutReturn {
  const [attempts, setAttempts] = useState(0);
  const [firstAttempt, setFirstAttempt] = useState<number | null>(null);
  const [timerEnd, setTimerEnd] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = readStorage(flow);
    if (!stored) return;
    const now = Date.now();
    if (stored.firstAttempt && now > stored.firstAttempt + SECONDS_IN_DAY) {
      // Bucket expired — start fresh.
      clearStorage(flow);
      return;
    }
    setAttempts(stored.attempts);
    setFirstAttempt(stored.firstAttempt);
    setTimerEnd(stored.timerEnd > now ? stored.timerEnd : 0);
  }, [flow]);

  // Tick the timer every second.
  useEffect(() => {
    if (!timerEnd || timerEnd === 0) return;
    const tick = () => {
      const now = Date.now();
      if (attempts >= RESEND_TIMEOUT.MAX_ATTEMPTS) {
        const dayResetAt = (firstAttempt ?? now) + SECONDS_IN_DAY;
        const diff = dayResetAt - now;
        if (diff <= 0) {
          clearStorage(flow);
          setAttempts(0);
          setFirstAttempt(null);
          setTimerEnd(0);
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.ceil(diff / 1000));
        }
      } else {
        const diff = timerEnd - now;
        if (diff <= 0) {
          setTimerEnd(0);
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.ceil(diff / 1000));
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flow, attempts, firstAttempt, timerEnd]);

  const beginAttempt = useCallback(() => {
    if (attempts >= RESEND_TIMEOUT.MAX_ATTEMPTS) return;
    const now = Date.now();
    const newAttempts = attempts + 1;
    const newFirstAttempt = firstAttempt ?? now;

    let delay = SECONDS_IN_MINUTE;
    if (newAttempts >= 5) delay = SECONDS_IN_HOUR;
    else if (newAttempts === 4) delay = SECONDS_IN_MINUTE * 10;

    let newTimerEnd = now + delay;
    if (newAttempts >= RESEND_TIMEOUT.MAX_ATTEMPTS) {
      newTimerEnd = newFirstAttempt + SECONDS_IN_DAY;
    }

    setAttempts(newAttempts);
    setFirstAttempt(newFirstAttempt);
    setTimerEnd(newTimerEnd);
    writeStorage(flow, {
      attempts: newAttempts,
      firstAttempt: newFirstAttempt,
      timerEnd: newTimerEnd,
    });
  }, [flow, attempts, firstAttempt]);

  const clearTimeoutFn = useCallback(() => {
    clearStorage(flow);
    setAttempts(0);
    setFirstAttempt(null);
    setTimerEnd(0);
    setTimeLeft(0);
  }, [flow]);

  return {
    timeLeft,
    attempts,
    maxAttempts: RESEND_TIMEOUT.MAX_ATTEMPTS,
    warningThreshold: RESEND_TIMEOUT.WARNING_THRESHOLD,
    isBlocked: attempts >= RESEND_TIMEOUT.MAX_ATTEMPTS,
    beginAttempt,
    clearTimeout: clearTimeoutFn,
  };
}
