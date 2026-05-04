'use client';

// 1:1 port of legacy components/authorization/components/link-expired.

import type { ReactElement } from 'react';

import type { TFunction } from '@/lib/i18n/createT';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';

interface LinkExpiredViewProps {
  className?: string;
  title?: string;
  description?: string;
  Icon?: ReactElement | null;
  buttonText?: string;
  onButtonClick?: () => void;
  /** Countdown next to the button. */
  time?: number | null;
  disabled?: boolean;
  /** Optional secondary "Back to login" — fixes E7 (legacy had no way out). */
  onBackClick?: () => void;
  t: TFunction;
}

export function LinkExpiredView({
  className = '',
  title,
  description,
  Icon,
  buttonText,
  onButtonClick,
  time,
  disabled = false,
  onBackClick,
  t,
}: LinkExpiredViewProps) {
  return (
    <AuthorizationSection
      className={['link-expired', className].filter(Boolean).join(' ')}
      title={title}
      Icon={Icon}
      description={description}
    >
      <div className="link-expired__content">
        {buttonText && (
          <NewButton
            className="link-expired__button"
            onClick={onButtonClick}
            disabled={disabled}
          >
            {buttonText}
            {time != null && time > 0 && (
              <span className="link-expired__button-time"> {time}</span>
            )}
          </NewButton>
        )}
        {onBackClick && (
          <button
            type="button"
            className="registration__footer-link"
            onClick={onBackClick}
            style={{ marginTop: 16, alignSelf: 'center', paddingRight: 0 }}
          >
            {t('AUTHORIZATION.BACK_BUTTON_TEXT')}
          </button>
        )}
      </div>
    </AuthorizationSection>
  );
}
