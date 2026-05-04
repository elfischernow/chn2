'use client';

// Shell for the row of alternate-auth buttons under login/register forms.
// Wires Google OAuth + WalletConnect + Metamask. Each button hides itself
// when its env config is missing or its dependency unavailable
// (legacy parity).

import { useState } from 'react';

import { useMetamaskInstalled } from '@/lib/dapp/metamask';
import type { TFunction } from '@/lib/i18n/createT';
import type { WalletConnectErrorType } from '@/lib/auth/constants';

import { GoogleAuthButton } from './GoogleAuthButton';
import { WalletConnectButton } from './WalletConnectButton';
import { WalletConnectError } from './WalletConnectError';

interface SocialButtonsProps {
  page: 'login' | 'register';
  t: TFunction;
  onGoogleSuccess: () => void;
  onGoogleError: (data: unknown, jwt?: string) => void;
  onGoogleLoadingChange: (loading: boolean) => void;
  /** Called when user clicks the Metamask button. Orchestrator switches
      currentForm to METAMASK_LOGIN / METAMASK_REGISTRATION. */
  onMetamaskClick: () => void;
  /** Called when WalletConnect auth fully succeeds (POST 204). */
  onWalletConnectSuccess: () => void;
  onWalletConnectTwoFa: () => void;
}

export function SocialButtons({
  page,
  t,
  onGoogleSuccess,
  onGoogleError,
  onGoogleLoadingChange,
  onMetamaskClick,
  onWalletConnectSuccess,
  onWalletConnectTwoFa,
}: SocialButtonsProps) {
  const isMetamaskInstalled = useMetamaskInstalled();
  const [wcError, setWcError] = useState<WalletConnectErrorType | null>(null);

  return (
    <>
      <div className="social-buttons">
        <WalletConnectButton
          t={t}
          title="Wallet Connect"
          onAuthSuccess={onWalletConnectSuccess}
          onTwoFaRequired={onWalletConnectTwoFa}
          onError={setWcError}
        />
        {isMetamaskInstalled && (
          <button
            type="button"
            className="social-buttons__button"
            onClick={onMetamaskClick}
          >
            <img src="/images/login/metamask.svg" alt="metamask" />
            <span className="social-buttons__text">Metamask</span>
          </button>
        )}
        <GoogleAuthButton
          page={page}
          onSuccess={onGoogleSuccess}
          onError={onGoogleError}
          onLoadingChange={onGoogleLoadingChange}
          buttonText={t('AUTHORIZATION.GOOGLE', 'Google')}
        />
      </div>
      <WalletConnectError t={t} error={wcError} />
    </>
  );
}
