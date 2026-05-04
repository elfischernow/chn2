// Streaming fallback for the localized segment. Sits below `[lang]/layout.tsx`
// (header + footer + chrome are already rendered) and fills the page slot
// with a low-stakes shell while server data resolves. Pages that need a
// richer skeleton can render their own <Suspense> boundaries inside.
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid var(--ink-3, rgba(0,0,0,0.15))',
          borderTopColor: 'var(--ink-1, #111)',
          animation: 'cn-spin 0.9s linear infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        Loading…
      </span>
      <style>{'@keyframes cn-spin { to { transform: rotate(360deg); } }'}</style>
    </main>
  );
}
