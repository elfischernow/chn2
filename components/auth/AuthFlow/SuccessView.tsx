'use client';

// 1:1 port of legacy components/authorization/components/success-block. Renders
// success/info screens (REGISTER_SUCCESS, FORGOT_PASSWORD_SUCCESS, EMAIL_CONFIRMED,
// PASSWORD_CHANGE_SUCCESS, RESEND_EMAIL_SUCCESS, CONNECTION_ERROR — all use this).

import type { ReactElement, ReactNode } from 'react';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';

interface SuccessViewProps {
  className?: string;
  title?: string;
  /** May contain HTML (legacy used dangerouslySetInnerHTML for emphasis spans). */
  description?: string | ReactNode;
  Icon?: ReactElement | null;
  buttonText?: string;
  onButtonClick?: () => void;
  /** Countdown shown next to the button (resend timer). */
  time?: number | null;
  disabled?: boolean;
}

export function SuccessView({
  className = '',
  title,
  description,
  Icon,
  buttonText,
  onButtonClick,
  time,
  disabled = false,
}: SuccessViewProps) {
  const descriptionContent =
    typeof description === 'string' ? (
      <div
        className="authorization-section__description"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    ) : description ? (
      <div className="authorization-section__description">{description}</div>
    ) : null;

  return (
    <AuthorizationSection
      className={['success-block', className].filter(Boolean).join(' ')}
      title={title}
      Icon={Icon}
      // We render description ourselves so node children are also supported.
    >
      {descriptionContent}
      <div className="success-block__content">
        {buttonText && (
          <NewButton
            className={[
              'success-block__button',
              time != null && time > 0 ? 'success-block__button_timer' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onButtonClick}
            disabled={disabled}
          >
            {buttonText}
            {time != null && time > 0 && (
              <span className="success-block__button-time"> {time}</span>
            )}
          </NewButton>
        )}
      </div>
    </AuthorizationSection>
  );
}
