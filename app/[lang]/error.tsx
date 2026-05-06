'use client';

// Segment-level error boundary. Catches errors that escape from the page
// tree (failed `fetch()` in a server component, hydration mismatch, etc.).
// Rendered below `[lang]/layout.tsx` — header/footer stay visible and the
// page slot is replaced with a recoverable shell.

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Errors thrown server-side ship to the client with a `digest` only —
    // the hash maps back to the full server log line.
    Sentry.captureException(error);
    if (typeof console !== 'undefined') console.error(error);
  }, [error]);

  return (
    <main
      role="alert"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        Something went wrong
      </div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: '12px 0 8px',
        }}
      >
        We couldn&apos;t load this page.
      </h1>
      <p style={{ color: 'var(--ink-2)', maxWidth: 480 }}>
        A transient failure stopped the page from rendering. Try again, or come back
        in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary btn-lg"
        style={{ marginTop: 24 }}
      >
        Try again
      </button>
    </main>
  );
}
