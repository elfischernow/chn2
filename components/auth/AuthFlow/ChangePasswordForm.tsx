'use client';

// 1:1 port of legacy components/authorization/components/change-password.
// Used by Pro/settings → "Change password" — landing here is normally via
// the modal-mode entry point. The standalone /authorization page does not
// auto-route to this form, but the orchestrator can still render it on
// `?form=change-password` for testability.

import { useId, type KeyboardEvent } from 'react';

import type { TFunction } from '@/lib/i18n/createT';
import { getPasswordQualityData as quality } from '@/lib/auth/validation';

import { EyeIcon } from '../icons/EyeIcon';
import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';
import { NewField } from '../ui/NewField';

import type { AuthDispatch, AuthFormState } from './state';

interface ChangePasswordFormProps {
  state: AuthFormState;
  dispatch: AuthDispatch;
  t: TFunction;
  onSubmit: () => void;
  onOldPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRepeatedPasswordChange: (value: string) => void;
}

export function ChangePasswordForm({
  state,
  dispatch,
  t,
  onSubmit,
  onOldPasswordChange,
  onPasswordChange,
  onRepeatedPasswordChange,
}: ChangePasswordFormProps) {
  const oldId = useId();
  const newId = useId();
  const repeatedId = useId();

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
  };

  const passwordType = state.isPasswordTextShown ? 'text' : 'password';
  const passwordQuality = state.password
    ? (() => {
        const q = quality(state.password);
        return { ...q, text: t(q.i18nKey) };
      })()
    : undefined;

  return (
    <AuthorizationSection title={t('AUTHORIZATION.CHANGE_PASSWORD.TITLE')}>
      <form
        className="change-password"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <NewField
          className="change-password__password-old"
          data={{
            type: passwordType,
            id: oldId,
            name: 'old-password',
            label: t('AUTHORIZATION.PASSWORD.OLD_PASSWORD_LABEL'),
            placeholder: t('AUTHORIZATION.PASSWORD.OLD_PASSWORD_PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.oldPassword,
            isError: !!state.oldPasswordError,
            isValid: state.isOldPasswordValid,
            errorText: state.oldPasswordError ? t(state.oldPasswordError, state.oldPasswordError) : null,
            onChange: (e) => onOldPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_OLD_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'current-password',
          }}
        />
        <NewField
          className="change-password__password"
          data={{
            type: passwordType,
            id: newId,
            name: 'new-password',
            label: t('AUTHORIZATION.PASSWORD.NEW_PASSWORD_LABEL'),
            placeholder: t('AUTHORIZATION.PASSWORD.NEW_PASSWORD_PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.password,
            isError: !!state.passwordError,
            isValid: state.isPasswordValid,
            errorText: state.passwordError ? t(state.passwordError, state.passwordError) : null,
            prompt: t('AUTHORIZATION.PASSWORD.LENGTH_ERROR'),
            quality: passwordQuality,
            onChange: (e) => onPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'new-password',
            Icon: state.password ? (
              <EyeIcon
                className="authorization__password-icon"
                isShow={state.isPasswordTextShown}
                color="#00C26F"
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })
                }
              />
            ) : null,
          }}
        />
        <NewField
          className="change-password__password-repeated"
          data={{
            type: passwordType,
            id: repeatedId,
            name: 'repeated-password',
            label: t('AUTHORIZATION.PASSWORD.CONFIRM_NEW_PASSWORD_LABEL'),
            placeholder: t('AUTHORIZATION.PASSWORD.CONFIRM_NEW_PASSWORD_PLACEHOLDER'),
            floatPlaceholder: true,
            value: state.repeatedPassword,
            isError: !!state.repeatedPasswordError,
            isValid: state.isRepeatedPasswordValid,
            errorText: state.repeatedPasswordError
              ? t(state.repeatedPasswordError, state.repeatedPasswordError)
              : null,
            onChange: (e) => onRepeatedPasswordChange(e.target.value),
            onFocus: () => dispatch({ type: 'CLEAR_REPEATED_PASSWORD_ERROR' }),
            onKeyPress: handleKeyPress,
            autoComplete: 'new-password',
          }}
        />
        <NewButton
          className="change-password__button"
          disabled={state.isFetching}
          isLoading={state.isFetching}
          onClick={onSubmit}
        >
          {t('AUTHORIZATION.CONFIRM_CHANGES')}
        </NewButton>
      </form>
    </AuthorizationSection>
  );
}
