// 1:1 port of legacy ui/new-warning/new-warning.jsx. Renders inline form
// errors. `isErrorWithAction` makes the warning clickable (used by
// "email already registered → switch to login" hint in registration).

import type { ReactNode } from 'react';

export interface NewWarningProps {
  className?: string;
  children?: ReactNode;
  isAbsolute?: boolean;
  isErrorWithAction?: boolean;
  onErrorClick?: () => void;
}

export function NewWarning({
  className = '',
  children,
  isAbsolute = false,
  isErrorWithAction = false,
  onErrorClick,
}: NewWarningProps) {
  const wrapperClass = ['new-warning', isAbsolute ? 'new-warning_absolute' : '', className]
    .filter(Boolean)
    .join(' ');

  if (isErrorWithAction) {
    return (
      <div className={wrapperClass} role="alert" aria-live="polite">
        <button
          type="button"
          className="new-warning__content new-warning__content_button sentry-mask"
          onClick={onErrorClick}
        >
          {children}
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass} role="alert" aria-live="polite">
      <div className="new-warning__content sentry-mask">{children}</div>
    </div>
  );
}
