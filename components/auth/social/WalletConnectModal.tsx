'use client';

// 1:1 port of legacy components/authorization/components/wallet-connect-modal.
// Used by SET_UP_WALLETCONNECT flow — adds a Web3 wallet to an existing
// account via /metamask/set-up-wallet-personal. Visually shows a status
// + spinner + error block.

import { useCallback, useEffect, useState } from 'react';

import { metamaskRequest, metamaskSetUpWalletPersonal } from '@/lib/auth/dal';
import {
  USER_DENIED_SIGN_KEYWORDS,
  WALLET_CONNECT_ERRORS,
  WALLET_CONNECT_ERROR_TYPES,
  type WalletConnectErrorType,
} from '@/lib/auth/constants';
import { useWalletConnect, utf8ToHex } from '@/lib/dapp/wallet-connect';
import type { TFunction } from '@/lib/i18n/createT';

import { AuthorizationSection } from '../AuthorizationSection';

interface WalletConnectModalProps {
  className?: string;
  t: TFunction;
  /** Called when wallet successfully linked (status 204). */
  onComplete: () => void;
  /** Called to switch back to LOGIN when user already exists. */
  onSwitchToLogin: () => void;
}

const includesAny = (msg: string, keywords: readonly string[]): boolean => {
  const lower = msg.toLowerCase();
  return keywords.some((k) => lower.includes(k));
};

export function WalletConnectModal({
  className = '',
  t,
  onComplete,
  onSwitchToLogin,
}: WalletConnectModalProps) {
  const wc = useWalletConnect();
  const [isLoading, setIsLoading] = useState(false);
  const [currentError, setCurrentError] = useState<WalletConnectErrorType | null>(null);

  const status = currentError
    ? t('AUTHORIZATION.WALLET_CONNECT.SOMETHING_WENT_WRONG')
    : t('AUTHORIZATION.WALLET_CONNECT.CONNECTING_TO_WALLET');

  const buildSignedMessage = useCallback(async () => {
    if (!wc.address || !wc.provider) return null;
    const nonceRes = await metamaskRequest(wc.address);
    const nonce = (nonceRes.data as { secret?: string } | undefined)?.secret;
    if (!nonce) return null;
    const message = [
      t('AUTHORIZATION.WELCOME_TO'),
      t('AUTHORIZATION.CLICK_TO_SIGN_IN'),
      t('AUTHORIZATION.NO_PASSWORD'),
      t('AUTHORIZATION.NOT_TRIGGER_BLOCKCHAIN'),
      nonce,
    ].join(' ');
    const hex = utf8ToHex(message);
    const sign = (await wc.provider.request({
      method: 'personal_sign',
      params: [hex, wc.address],
    })) as string;
    return [sign, message] as const;
  }, [wc.address, wc.provider, t]);

  const setUpWallet = useCallback(async () => {
    if (!wc.address) return;
    setIsLoading(true);
    try {
      const signed = await buildSignedMessage();
      if (!signed) return;
      const [sign, message] = signed;
      const result = await metamaskSetUpWalletPersonal({
        sign,
        address: wc.address,
        message,
      });
      if (result.status === 204) {
        onComplete();
        return;
      }
      const errorMessage =
        (result.data as { errorData?: { message?: string } })?.errorData?.message;
      if (errorMessage === WALLET_CONNECT_ERRORS.ADDRESS_ALREADY_EXISTS) {
        setCurrentError(WALLET_CONNECT_ERROR_TYPES.ALREADY_EXISTS);
      } else if (errorMessage) {
        setCurrentError(WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (includesAny(msg, USER_DENIED_SIGN_KEYWORDS)) {
        setCurrentError(WALLET_CONNECT_ERROR_TYPES.DENIED_SIGNATURE);
      } else {
        setCurrentError(WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG);
      }
    } finally {
      setIsLoading(false);
    }
  }, [wc.address, buildSignedMessage, onComplete]);

  // Auto-init: connect on mount, then sign once we have an address.
  useEffect(() => {
    if (wc.address) {
      const t = setTimeout(() => void setUpWallet(), 1000);
      return () => clearTimeout(t);
    }
    void wc.connect();
  }, [wc.address, wc.connect, setUpWallet]);

  // WC hook surfaces a "user-rejected" error code separately.
  useEffect(() => {
    if (wc.error?.includes('Rejected')) {
      setCurrentError(WALLET_CONNECT_ERROR_TYPES.USER_REJECTED);
    }
  }, [wc.error]);

  const handleTryAgain = useCallback(async () => {
    if (isLoading) {
      await wc.disconnect();
      return;
    }
    setCurrentError(null);
    if (wc.address) {
      await setUpWallet();
    } else {
      await wc.connect();
    }
  }, [isLoading, wc, setUpWallet]);

  return (
    <AuthorizationSection
      title={t('AUTHORIZATION.SET_UP_WALLET.ADD_WEB3_WALLET', 'Add Web3 wallet')}
      className={['wallet-connect-modal', className].filter(Boolean).join(' ')}
    >
      <img
        className="wallet-connect-modal__icon"
        src="/images/login/wallet-connect.svg"
        alt="wallet-connect"
      />
      <div className="wallet-connect-modal__status">{status}</div>
      {isLoading && (
        <div className="wallet-connect-modal__pending">
          <img
            className="button_loader-image"
            src="/images/loader.gif"
            alt="loader"
          />
          {t('AUTHORIZATION.WALLET_CONNECT.PENDING', 'Pending')}
        </div>
      )}
      {currentError && (
        <div className="wallet-connect-modal__error">
          {currentError === WALLET_CONNECT_ERROR_TYPES.ALREADY_EXISTS && (
            <>
              {t('AUTHORIZATION.WALLET_CONNECT.ALREADY_EXISTS')}{' '}
              <button
                className="wallet-connect-modal__error-button"
                type="button"
                onClick={onSwitchToLogin}
              >
                {t('AUTHORIZATION.SIGN_IN').toLowerCase()}
              </button>
              .
            </>
          )}
          {currentError === WALLET_CONNECT_ERROR_TYPES.USER_REJECTED && (
            <>
              {t('AUTHORIZATION.WALLET_CONNECT.REJECTED')}{' '}
              <button
                className="wallet-connect-modal__error-button"
                type="button"
                onClick={handleTryAgain}
              >
                {t('AUTHORIZATION.WALLET_CONNECT.TRY_AGAIN')}
              </button>
              .
            </>
          )}
          {currentError === WALLET_CONNECT_ERROR_TYPES.DENIED_SIGNATURE && (
            <>
              {t('AUTHORIZATION.WALLET_CONNECT.DENIED_SIGNATURE')}{' '}
              <button
                className="wallet-connect-modal__error-button"
                type="button"
                onClick={handleTryAgain}
              >
                {t('AUTHORIZATION.WALLET_CONNECT.TRY_AGAIN')}
              </button>
              .
            </>
          )}
          {currentError === WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG && (
            t('AUTHORIZATION.WALLET_CONNECT.UNKNOWN_ERROR')
          )}
        </div>
      )}
    </AuthorizationSection>
  );
}
