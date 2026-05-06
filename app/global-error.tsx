'use client';

// Root-level error boundary — catches errors thrown by the root layout
// itself (fonts loading, i18n dict failure). Renders its own <html>/<body>
// because `[lang]/layout.tsx` may not have mounted yet.

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>Something went wrong</h1>
        <p style={{ color: '#666', maxWidth: 480, margin: '0 0 24px' }}>
          The page failed to load. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 24px',
            background: '#000',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
