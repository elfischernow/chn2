'use client';

import { useCallback, useRef, useState } from 'react';

const HOLD_MS = 3000;

interface LongPressButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LongPressButton({
  onComplete,
  disabled,
  busy,
  children,
  className,
}: LongPressButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_MS, 1);
    setProgress(pct);
    if (pct >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete]);

  const start = useCallback(() => {
    if (disabled || busy) return;
    firedRef.current = false;
    startRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, busy, tick]);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      type="button"
      className={`swap-cta swap-cta-longpress ${className ?? ''}`}
      data-holding={holding || undefined}
      data-busy={busy || undefined}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || busy}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
    >
      <span
        className="swap-cta-longpress-fill"
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="swap-cta-longpress-label">
        {busy ? 'Placing…' : children}
      </span>
    </button>
  );
}
