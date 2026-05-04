// 1:1 port of legacy components/authorization/components/authorization-section.
// Wraps every sub-form (login, register, forgot-password, security-verification,
// success-block, link-expired) with the same header (icon + title + optional
// section-link) and content area.

import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

interface AuthorizationSectionProps {
  className?: string;
  Icon?: ReactElement | null;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  /** When true, scroll the modal into view on captcha appearance. */
  recapture?: boolean;
  /** "I have an account" / "Create account" link in the header. */
  linkText?: string;
  linkHandler?: () => void;
}

export function AuthorizationSection({
  className = '',
  Icon,
  title,
  description,
  children,
  recapture = false,
  linkText,
  linkHandler,
}: AuthorizationSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!recapture) return;
    const scrollable = ref.current?.closest('.MuiDialogContent-root');
    if (scrollable) {
      scrollable.scrollTo({ top: scrollable.scrollHeight, behavior: 'smooth' });
    }
  }, [recapture]);

  return (
    <div ref={ref} className={['authorization-section', className].filter(Boolean).join(' ')}>
      <div className="authorization-section-header">
        {Icon && <div className="authorization-section__icon">{Icon}</div>}
        {title && <div className="authorization-section__title">{title}</div>}
        {linkText && (
          <button
            type="button"
            className="registration__footer-link"
            onClick={linkHandler}
          >
            {linkText}
          </button>
        )}
        {description && (
          <div
            className="authorization-section__description"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </div>
      <div className="authorization-section__content">{children}</div>
    </div>
  );
}
