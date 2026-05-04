// 1:1 port of legacy ui/new-field/new-field.jsx. The QR-scanner branch is
// dropped — auth pages never use it (only the swap stepper does).

import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, ReactNode } from 'react';

import type { PasswordQualityData } from '@/lib/auth/validation';

import { NewInput } from './NewInput';
import { NewWarning } from './NewWarning';

export interface NewFieldData {
  type?: string;
  id?: string;
  name?: string;
  label?: ReactNode;
  secondLabel?: string;
  footerLabel?: string;
  placeholder?: string;
  /** When true, placeholder floats up like a Material text field. */
  floatPlaceholder?: boolean;
  value: string;
  isDisabled?: boolean;
  isError?: boolean;
  isValid?: boolean;
  errorText?: string | null;
  prompt?: string;
  /** Right-side icon (e.g. Eye-toggle). */
  Icon?: ReactElement | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onSecondLabelClick?: () => void;
  onFooterLabelClick?: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
  /** Password-quality strength meter under the field. */
  quality?: PasswordQualityData & { text: string };
}

export interface NewFieldProps {
  className?: string;
  data: NewFieldData;
  /** When true, errorText becomes a clickable button (e.g. "switch to login"). */
  isErrorWithAction?: boolean;
  onErrorClick?: () => void;
}

export function NewField({
  className = '',
  data,
  isErrorWithAction = false,
  onErrorClick,
}: NewFieldProps) {
  const hasPrompts = !!data.prompt || !!data.quality;

  return (
    <div className={['new-field', className].filter(Boolean).join(' ')}>
      {(data.label || data.secondLabel) && (
        <div className="new-field__header">
          {data.label && (
            <label className="new-field__label" htmlFor={data.id}>
              {data.label}
            </label>
          )}
          {data.secondLabel && (
            <button
              type="button"
              className="new-field__second-label"
              onClick={data.onSecondLabelClick}
            >
              {data.secondLabel}
            </button>
          )}
        </div>
      )}
      <div
        className={[
          'new-field__input',
          data.floatPlaceholder ? 'new-field__input-placeholder' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <NewInput
          type={data.type ?? 'text'}
          id={data.id}
          name={data.name}
          value={data.value}
          placeholder={data.placeholder ?? ''}
          isDisabled={data.isDisabled}
          isError={data.isError}
          isValid={data.isValid}
          onChange={data.onChange}
          onKeyPress={data.onKeyPress}
          onFocus={data.onFocus}
          autoComplete={data.autoComplete}
          autoFocus={data.autoFocus}
        />
        {data.floatPlaceholder && (
          <span className="new-field-input__placeholder">{data.placeholder}</span>
        )}
        {data.Icon && <div className="new-field__icon">{data.Icon}</div>}
      </div>

      {data.errorText && (
        <NewWarning
          className="new-field__warning"
          isAbsolute
          isErrorWithAction={isErrorWithAction}
          onErrorClick={onErrorClick}
        >
          {data.errorText}
        </NewWarning>
      )}

      {data.footerLabel && (
        <div className="new-field__footer">
          <button
            type="button"
            className="new-field__footer-label"
            onClick={data.onFooterLabelClick}
          >
            {data.footerLabel}
          </button>
        </div>
      )}

      {hasPrompts && (
        <div className="new-field__field-prompts">
          {data.prompt && <div className="new-field__prompt">{data.prompt}</div>}
          {data.quality && (
            <div
              className={[
                'new-field__quality-prompt',
                'quality-prompt',
                `quality-prompt_${data.quality.level}`,
              ].join(' ')}
            >
              <img
                src={data.quality.icon}
                alt={data.quality.level}
                loading="lazy"
                className="quality-prompt__icon"
              />
              <div>{data.quality.text}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
