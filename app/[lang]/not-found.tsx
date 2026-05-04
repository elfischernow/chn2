import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="page-wrap"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', textAlign: 'center' }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        404
      </div>
      <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '16px 0 8px' }}>
        Page not found.
      </h1>
      <p style={{ color: 'var(--ink-2)', maxWidth: 480 }}>
        The page you&apos;re looking for moved or never existed. Try the homepage.
      </p>
      <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 24, textDecoration: 'none' }}>
        Take me home →
      </Link>
    </main>
  );
}
