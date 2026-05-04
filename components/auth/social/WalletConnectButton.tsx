'use client';

// 1:1 port of legacy components/authorization/components/wallet-connect-button.
// Login-only: signs the same nonce message we use for MM, then POSTs to
// /metamask/confirm-personal. **Replaces legacy's hardcoded /pro/exchange
// redirect with the unified `resolveClientPostAuthTarget`** — fix E24 in
// docs/auth-migration-plan.md.

import { useCallback, useEffect, useState } from 'react';

import { metamaskConfirmPersonal, metamaskRequest } from '@/lib/auth/dal';
import {
  USER_DENIED_SIGN_KEYWORDS,
  WALLET_CONNECT_ERROR_TYPES,
  type WalletConnectErrorType,
} from '@/lib/auth/constants';
import { useWalletConnect, utf8ToHex } from '@/lib/dapp/wallet-connect';
import { getLandingPage } from '@/lib/auth/landing-page';
import { getUtms } from '@/lib/auth/utm';
import type { TFunction } from '@/lib/i18n/createT';

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? '';

interface WalletConnectButtonProps {
  className?: string;
  title?: string;
  t: TFunction;
  /** Called when auth completes — caller redirects via post-auth resolver. */
  onAuthSuccess: () => void;
  onTwoFaRequired: () => void;
  /** Forwarded out so the orchestrator can render the inline error block. */
  onError: (type: WalletConnectErrorType | null) => void;
}

const includesAny = (msg: string, keywords: readonly string[]): boolean => {
  const lower = msg.toLowerCase();
  return keywords.some((k) => lower.includes(k));
};

export function WalletConnectButton({
  className = '',
  title,
  t,
  onAuthSuccess,
  onTwoFaRequired,
  onError,
}: WalletConnectButtonProps) {
  const wc = useWalletConnect();
  const [isLoading, setIsLoading] = useState(false);

  // Surface the WC hook's error-state to the orchestrator.
  useEffect(() => {
    if (wc.error && wc.error === 'UserRejectedRequestError') {
      onError(WALLET_CONNECT_ERROR_TYPES.USER_REJECTED);
      setIsLoading(false);
    } else if (wc.error) {
      // Don't surface generic init errors as a hard error; legacy ignored
      // these unless they contained "rejected". Caller can read wc.error
      // for detail.
    }
  }, [wc.error, onError]);

  const buildSignedMessage = useCallback(
    async (provider: NonNullable<ReturnType<typeof useWalletConnect>['provider']>, address: string): Promise<[string, string] | null> => {
      const nonceRes = await metamaskRequest(address);
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
      try {
        const sign = (await provider.request({
          method: 'personal_sign',
          params: [hex, address],
        })) as string;
        return [sign, message];
      } catch (err) {
        if (err instanceof Error && includesAny(err.message, USER_DENIED_SIGN_KEYWORDS)) {
          onError(WALLET_CONNECT_ERROR_TYPES.DENIED_SIGNATURE);
        } else {
          onError(WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG);
        }
        return null;
      }
    },
    [t, onError],
  );

  const authenticateWallet = useCallback(
    async (provider: NonNullable<ReturnType<typeof useWalletConnect>['provider']>) => {
      setIsLoading(true);
      onError(null);
      try {
        const address = provider.accounts?.[0];
        if (!address) return;
        const signed = await buildSignedMessage(provider, address);
        if (!signed) return;
        const [sign, message] = signed;

        const result = await metamaskConfirmPersonal({
          sign,
          address,
          message,
          utmData: { ...getUtms() },
          landingPage: getLandingPage(),
        });

        if (result.status === 204) {
          const data = result.data as { code?: string } | undefined;
          if (data?.code === '2FA_CODE_NEEDED') {
            onTwoFaRequired();
          } else {
            onAuthSuccess();
          }
          return;
        }

        if ((result.data as { errorData?: { message?: string } })?.errorData?.message) {
          onError(WALLET_CONNECT_ERROR_TYPES.SOMETHING_WRONG);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [buildSignedMessage, onAuthSuccess, onTwoFaRequired, onError],
  );

  const handleClick = useCallback(async () => {
    onError(null);
    if (isLoading) {
      setIsLoading(false);
      return;
    }
    const provider = await wc.init();
    if (!provider) return;
    if (provider.connected && provider.accounts?.[0]) {
      // Existing session — sign immediately (with 2s settle to mirror legacy).
      setTimeout(() => {
        void authenticateWallet(provider);
      }, 2000);
      return;
    }
    const address = await wc.connect(true, provider);
    if (address) {
      setTimeout(() => {
        void authenticateWallet(provider);
      }, 2000);
    }
  }, [wc, authenticateWallet, isLoading, onError]);

  // Hide entirely when WC isn't configured.
  if (!WC_PROJECT_ID) return null;

  return (
    <button
      type="button"
      className={['social-buttons__button', className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {isLoading ? (
        <img className="button_loader-image" src="/images/loader.gif" alt="loader" />
      ) : (
        <img src="/images/login/wallet-connect.svg" alt="wallet-connect" />
      )}
      {title && <span className="social-buttons__text">{title}</span>}
      {wc.connected && <span className="social-buttons__connected" title="Connected" />}
    </button>
  );
}
