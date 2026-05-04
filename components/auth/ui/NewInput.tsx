// 1:1 port of legacy components/ui/new-input/new-input.jsx.
// Class names match legacy verbatim so styles in components/auth/styles.css
// apply unchanged.

import { forwardRef, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';

export interface NewInputProps {
  type?: string;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  value?: string;
  isDisabled?: boolean;
  isError?: boolean;
  isValid?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  autoFocus?: boolean;
}

export const NewInput = forwardRef<HTMLInputElement, NewInputProps>(function NewInput(
  props,
  ref,
) {
  const {
    type = 'text',
    id,
    name,
    className,
    placeholder = '',
    value = '',
    isDisabled = false,
    isError = false,
    isValid = false,
    onChange,
    onKeyPress,
    onFocus,
    autoComplete,
    autoFocus = false,
  } = props;

  const classes = [
    'new-input',
    isValid ? 'new-input_success' : '',
    isError ? 'new-input_error' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      type={type}
      id={id}
      name={name}
      className={classes}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onFocus={onFocus}
      disabled={isDisabled}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      aria-invalid={isError || undefined}
      ref={ref}
    />
  );
});
