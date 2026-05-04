// 1:1 port of legacy ui/new-checkbox/new-checkbox.jsx.

import type { ReactElement } from 'react';

export interface NewCheckboxProps {
  id: string;
  className?: string;
  isChecked?: boolean;
  isError?: boolean;
  Icon?: ReactElement | null;
  disabled?: boolean;
  onChange?: () => void;
}

export function NewCheckbox({
  id,
  className = '',
  isChecked = false,
  isError = false,
  Icon,
  disabled = false,
  onChange,
}: NewCheckboxProps) {
  const wrapperClass = [
    'new-checkbox',
    !isChecked && isError ? 'new-checkbox_error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={wrapperClass}>
      <input
        id={id}
        type="checkbox"
        className="new-checkbox__input"
        checked={isChecked}
        disabled={disabled}
        onChange={() => {
          if (!disabled) onChange?.();
        }}
      />
      <span className="new-checkbox__box">{Icon}</span>
    </span>
  );
}
