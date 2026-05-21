'use client';

// 1:1 port of legacy components/authorization/components/google-auth-button.
// Loads Google's One-Tap SDK via next/script, renders a hidden official
// button on top of our styled custom button, then forwards the credential
// response to the orchestrator. The orchestrator owns POSTing the JWT to
// `/v1/o-auth/google/web` and reacting (success / EMAIL_ALREADY_EXISTS /
// FA_CODE_NEEDED / CODE_NEEDED / unknown).

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

import { googleOauth } from '@/lib/auth/dal';

import { GoogleIcon } from '../icons/GoogleIcon';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            container: HTMLElement,
            options: { size?: 'large' | 'medium' | 'small'; theme?: string },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  page: 'login' | 'register';
  onSuccess: () => void;
  onError: (data: unknown, jwt?: string) => void;
  onLoadingChange: (loading: boolean) => void;
  buttonText: string;
}

export function GoogleAuthButton({
  page,
  onSuccess,
  onError,
  onLoadingChange,
  buttonText,
}: GoogleAuthButtonProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.google?.accounts?.id.cancel();
    };
  }, []);

  const handleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        onError({ errorMessage: 'Error' });
        return;
      }
      setIsLoading(true);
      onLoadingChange(true);
      const result = await googleOauth({ googleIdToken: response.credential });
      if (!mountedRef.current) return;
      setIsLoading(false);
      onLoadingChange(false);
      const status =
        result.status ||
        (result.data as { status?: number } | null | undefined)?.status;
      const is2xx =
        status === 204 || (!result.isError && !!status && status >= 200 && status < 300);
      // `/v1.0/o-auth/google/web` returns 200 + `{ code: '2FA_CODE_NEEDED' }` when
      // the linked user has 2FA enabled, and 204 + full session cookies on real
      // success. Funnelling the 200+code case into `onSuccess` would bypass 2FA —
      // route it through `onError` so the orchestrator switches to security-
      // verification (it already handles `code === '2FA_CODE_NEEDED'`).
      const successCode =
        is2xx && result.data && typeof result.data === 'object'
          ? (result.data as { code?: unknown }).code
          : undefined;
      if (is2xx && successCode !== '2FA_CODE_NEEDED') {
        onSuccess();
      } else {
        onError(result.data, response.credential);
      }
    },
    [onSuccess, onError, onLoadingChange],
  );

  // Initialise SDK once it's loaded.
  useEffect(() => {
    if (!sdkReady || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    if (overlayRef.current) {
      overlayRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(overlayRef.current, { size: 'large' });
    }
  }, [sdkReady, handleCredential]);

  if (!GOOGLE_CLIENT_ID) {
    // Hide button entirely — legacy behaviour from social-buttons.jsx:60.
    return null;
  }

  return (
    <div
      className={['social-buttons__google', 'social-buttons__button']
        .filter(Boolean)
        .join(' ')}
      data-page={page}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onLoad={() => setSdkReady(true)}
      />
      <div
        aria-hidden
        className="social-buttons__google-overlay"
        ref={overlayRef}
      />
      <button
        type="button"
        className="social-buttons__google__custom"
        disabled={isLoading}
      >
        <GoogleIcon />
        <span className="social-buttons__text">{buttonText}</span>
      </button>
    </div>
  );
}
