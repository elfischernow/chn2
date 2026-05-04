// 1:1 port of legacy ui/wallet-connect-error/wallet-connect-error.jsx.

import type { TFunction } from '@/lib/i18n/createT';
import { WALLET_CONNECT_ERROR_TYPES, type WalletConnectErrorType } from '@/lib/auth/constants';

interface WalletConnectErrorProps {
  className?: string;
  error: WalletConnectErrorType | null;
  t: TFunction;
}

export function WalletConnectError({ className = '', error, t }: WalletConnectErrorProps) {
  if (!error) return null;
  const isRejected =
    error === WALLET_CONNECT_ERROR_TYPES.USER_REJECTED ||
    error === WALLET_CONNECT_ERROR_TYPES.DENIED_SIGNATURE;

  return (
    <div className={['wallet-connect-error', className].filter(Boolean).join(' ')}>
      {isRejected && (
        <>
          {error === WALLET_CONNECT_ERROR_TYPES.DENIED_SIGNATURE
            ? t('AUTHORIZATION.WALLET_CONNECT.DENIED_SIGNATURE')
            : t('AUTHORIZATION.WALLET_CONNECT.REJECTED')}{' '}
          {t('AUTHORIZATION.WALLET_CONNECT.TRY_AGAIN')}.
        </>
      )}
      {error === WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG && (
        <>{t('AUTHORIZATION.WALLET_CONNECT.SOMETHING_WENT_WRONG')}</>
      )}
    </div>
  );
}
