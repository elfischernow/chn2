'use client';

// Cloudflare Turnstile invisible widget. Expose an imperative
// `executeAsync(): Promise<string>` so the orchestrator can lazily request
// a token only at submit time, matching legacy InvisibleTurnstile behaviour.
//
// In iteration 2 we keep this as a minimal wrapper — the SDK loads on first
// render via next/script. Iteration 8 hardens it with timeout + retry UI
// (edge case E20 in docs/auth-migration-plan.md).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          size?: 'normal' | 'compact' | 'invisible';
          theme?: 'light' | 'dark' | 'auto';
          retry?: 'auto' | 'never';
          'refresh-expired'?: 'auto' | 'manual' | 'never';
        },
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileHandle {
  /** Trigger the captcha. Resolves with a token, rejects on failure/timeout. */
  executeAsync: () => Promise<string>;
  /** Reset the widget (legacy calls this on CAPTCHA_NEEDED). */
  reset: () => void;
  /** Whether a token was already obtained in this session. */
  hasToken: () => boolean;
}

interface TurnstileProps {
  sitekey: string;
  /** Called once when the widget produces a fresh token. */
  onSuccess?: (token: string) => void;
  /** Called when the widget errors (network, expired, etc.). */
  onError?: () => void;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { sitekey, onSuccess, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const pendingResolveRef = useRef<((t: string) => void) | null>(null);
  const pendingRejectRef = useRef<((err: Error) => void) | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || widgetIdRef.current) return;
    if (!sitekey) return;
    if (!window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      size: 'invisible',
      theme: 'auto',
      retry: 'auto',
      'refresh-expired': 'auto',
      callback: (token) => {
        tokenRef.current = token;
        onSuccess?.(token);
        pendingResolveRef.current?.(token);
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      },
      'error-callback': () => {
        onError?.();
        pendingRejectRef.current?.(new Error('Turnstile failed'));
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      },
      'expired-callback': () => {
        tokenRef.current = null;
      },
    });

    return () => {
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [scriptReady, sitekey, onSuccess, onError]);

  useImperativeHandle(
    ref,
    () => ({
      executeAsync: () => {
        if (tokenRef.current) {
          return Promise.resolve(tokenRef.current);
        }
        if (!sitekey) {
          // No sitekey configured (e.g. local dev) — skip captcha.
          return Promise.resolve('');
        }
        if (!widgetIdRef.current || !window.turnstile) {
          return Promise.reject(new Error('Turnstile not ready'));
        }
        // E20 fix: 30s timeout — if Cloudflare doesn't resolve, reject so the
        // orchestrator can show "retry captcha" rather than spinning forever.
        return new Promise<string>((resolve, reject) => {
          pendingResolveRef.current = resolve;
          pendingRejectRef.current = reject;
          const timeoutId = window.setTimeout(() => {
            if (pendingRejectRef.current === reject) {
              pendingResolveRef.current = null;
              pendingRejectRef.current = null;
              reject(new Error('Turnstile timeout'));
            }
          }, 30_000);
          // Wrap the resolvers so they also clear the timeout.
          const wrappedResolve = (token: string) => {
            window.clearTimeout(timeoutId);
            resolve(token);
          };
          const wrappedReject = (err: Error) => {
            window.clearTimeout(timeoutId);
            reject(err);
          };
          pendingResolveRef.current = wrappedResolve;
          pendingRejectRef.current = wrappedReject;
          window.turnstile?.execute(widgetIdRef.current!);
        });
      },
      reset: () => {
        tokenRef.current = null;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      hasToken: () => !!tokenRef.current,
    }),
    [sitekey],
  );

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="turnstile-wrapper" />
    </>
  );
});
