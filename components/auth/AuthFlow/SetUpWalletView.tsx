'use client';

// 1:1 port of legacy components/authorization/components/set-up-wallet.
// Picker for "Add Web3 wallet" — branches into MetamaskLogin (walletSetUp)
// or WalletConnectModal.

import { useIsBraveBrowser, useMetamaskInstalled } from '@/lib/dapp/metamask';
import type { TFunction } from '@/lib/i18n/createT';

import { AuthorizationSection } from '../AuthorizationSection';

interface SetUpWalletViewProps {
  t: TFunction;
  onMetamaskClick: () => void;
  onWalletConnectClick: () => void;
}

export function SetUpWalletView({
  t,
  onMetamaskClick,
  onWalletConnectClick,
}: SetUpWalletViewProps) {
  const isMmInstalled = useMetamaskInstalled();
  const isBrave = useIsBraveBrowser();

  const text = isMmInstalled
    ? t('AUTHORIZATION.SET_UP_WALLET.TITLE')
    : t('AUTHORIZATION.SET_UP_WALLET.TITLE_WITHOUT_METAMASK');

  return (
    <AuthorizationSection
      title={t('AUTHORIZATION.SET_UP_WALLET.ADD_WEB3_WALLET', 'Add Web3 wallet')}
      className="set-up-wallet"
    >
      <p className="set-up-wallet__text">{text}</p>
      <div className="set-up-wallet__buttons">
        <button
          type="button"
          className="social-buttons__button social-buttons__button_big"
          onClick={onWalletConnectClick}
        >
          <img src="/images/login/wallet-connect.svg" alt="wallet-connect" decoding="async" />
        </button>
        {isMmInstalled && (
          <button
            type="button"
            className="social-buttons__button social-buttons__button_big"
            onClick={onMetamaskClick}
          >
            <img
              src={isBrave ? '/images/login/brave.svg' : '/images/login/metamask.svg'}
              alt={isBrave ? 'brave' : 'metamask'}
              decoding="async"
            />
          </button>
        )}
      </div>
    </AuthorizationSection>
  );
}
