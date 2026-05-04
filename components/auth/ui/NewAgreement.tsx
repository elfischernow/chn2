// 1:1 port of legacy ui/new-agreement/new-agreement.jsx. Wraps a NewCheckbox
// with multiline label content and an `_orange` highlight when required +
// not yet checked (used by the Terms-of-Use checkbox during register).

import type { ReactElement, ReactNode } from 'react';

import { NewCheckbox } from './NewCheckbox';

export interface NewAgreementData {
  isChecked: boolean;
  isError?: boolean;
  Icon?: ReactElement | null;
  onChange?: () => void;
}

export interface NewAgreementProps {
  id: string;
  className?: string;
  data: NewAgreementData;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
}

export function NewAgreement({
  id,
  className = '',
  data,
  children,
  disabled = false,
  required = false,
}: NewAgreementProps) {
  const labelClass = ['new-agreement', className].filter(Boolean).join(' ');
  const contentClass = [
    'new-agreement__content',
    !data.isChecked && required ? 'new-agreement__content_orange' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={labelClass} htmlFor={`new-agreement-${id}`}>
      <NewCheckbox
        id={`new-agreement-${id}`}
        className="new-agreement__checkbox"
        isChecked={data.isChecked}
        isError={data.isError}
        Icon={data.Icon ?? null}
        disabled={disabled}
        onChange={data.onChange}
      />
      <span className={contentClass}>{children}</span>
    </label>
  );
}
