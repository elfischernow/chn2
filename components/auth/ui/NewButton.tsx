// 1:1 port of legacy ui/new-button/new-button.jsx. Drops `isLink` (auth pages
// never render this button as an <a>) and the `isWhiteTheme` flag (unused in
// the auth flows). LoaderIcon is replaced with an inline minimal spinner.

import type { MouseEvent, ReactElement, ReactNode } from 'react';

export interface NewButtonProps {
  children?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  isLoading?: boolean;
  Icon?: ReactElement | null;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function NewButton({
  children,
  className = '',
  type = 'button',
  disabled = false,
  isLoading = false,
  Icon,
  onClick,
}: NewButtonProps) {
  const classes = ['new-button', className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || isLoading}
      tabIndex={0}
    >
      {isLoading ? <Spinner /> : (
        <>
          {Icon}
          {children}
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 50 50"
      style={{ animation: 'auth-spinner-rotate 0.8s linear infinite' }}
      aria-hidden
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="5"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="80 200"
      />
      <style>{`@keyframes auth-spinner-rotate { from { transform: rotate(0); transform-origin: 25px 25px; } to { transform: rotate(360deg); transform-origin: 25px 25px; } }`}</style>
    </svg>
  );
}
