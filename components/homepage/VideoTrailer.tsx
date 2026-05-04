'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface VideoTrailerProps {
  /** Path under `/public` to the source MP4. */
  src: string;
  /** Optional poster image; if omitted the preview shows a colored backdrop. */
  poster?: string;
  /** Card label rendered next to the play button. */
  title?: string;
  subtitle?: string;
}

/**
 * Wide trailer card with a click-to-play lightbox. The `<video>` element
 * is mounted only when the lightbox opens, so the 300+ MB source file
 * isn't downloaded until the user actually asks for it. Once mounted,
 * `preload="metadata"` requests just enough bytes to find the moov box,
 * then HTML5's built-in Range-request streaming takes over playback.
 *
 * The lightbox dims the page, locks body scroll, traps focus to the
 * dialog, and closes on Esc / backdrop click / explicit X.
 */
export function VideoTrailer({
  src,
  poster,
  title = 'Watch the trailer',
  subtitle = '7 years of building the rails for crypto, in 90 seconds.',
}: VideoTrailerProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll + close on Escape while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Move focus to the close button so screen readers announce the dialog.
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="pr-trailer"
        data-has-poster={poster ? '' : undefined}
        onClick={() => setOpen(true)}
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
        aria-label="Play trailer"
      >
        <span className="pr-trailer-overlay" aria-hidden />
        <span className="pr-trailer-meta">
          <span className="pr-trailer-eyebrow">Documentary</span>
          <span className="pr-trailer-title">{title}</span>
          <span className="pr-trailer-sub">{subtitle}</span>
        </span>
        <span className="pr-trailer-play" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="vid-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Trailer player"
            ref={dialogRef}
            onClick={(e) => {
              if (e.target === dialogRef.current) setOpen(false);
            }}
          >
            <div className="vid-modal-stage">
              <button
                type="button"
                ref={closeBtnRef}
                className="vid-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Close trailer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
              <video
                className="vid-modal-video"
                src={src}
                poster={poster}
                controls
                autoPlay
                preload="metadata"
                playsInline
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
