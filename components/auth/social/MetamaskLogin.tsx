'use client';

// 1:1 port of legacy components/authorization/components/metamask-login.
// Handles three modes:
//   - login (registration=false, walletSetUp=false)
//   - register (registration=true)
//   - add-wallet to existing account (walletSetUp=true)

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  metamaskConfirm,
  metamaskRequest,
  metamaskSetUpWallet,
} from '@/lib/auth/dal';
import { ETH_REQUEST_TYPES, ethRequest, useMetamaskInstalled } from '@/lib/dapp/metamask';
import { getLandingPage } from '@/lib/auth/landing-page';
import { getUtms } from '@/lib/auth/utm';
import type { TFunction } from '@/lib/i18n/createT';

import { AuthorizationSection } from '../AuthorizationSection';
import { NewButton } from '../ui/NewButton';

interface MetamaskLoginProps {
  t: TFunction;
  registration?: boolean;
  walletSetUp?: boolean;
  /** Called once auth completes — caller decides redirect target. */
  onAuthSuccess: () => void;
  /** Called when 2FA is required (legacy `code === '2FA_CODE_NEEDED'`). */
  onTwoFaRequired: () => void;
}

export function MetamaskLogin({
  t,
  registration = false,
  walletSetUp = false,
  onAuthSuccess,
  onTwoFaRequired,
}: MetamaskLoginProps) {
  const isInstalled = useMetamaskInstalled();
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionText = registration
    ? t('AUTHORIZATION.SIGN_UP')
    : t('AUTHORIZATION.LOG_IN');

  const sectionTitle = walletSetUp
    ? t('AUTHORIZATION.SET_UP_WALLET.ADD_WEB3_WALLET', 'Add Web3 wallet')
    : registration
      ? t('AUTHORIZATION.METAMASK.SECTION_TITLE_REGISTER', 'Sign Up with MetaMask')
      : t('AUTHORIZATION.METAMASK.SECTION_TITLE_LOGIN', 'Log In with MetaMask');

  const message = useMemo(() => {
    return [
      t('AUTHORIZATION.WELCOME_TO'),
      registration
        ? t('AUTHORIZATION.CLICK_TO_SIGN_UP')
        : t('AUTHORIZATION.CLICK_TO_SIGN_IN'),
      t('AUTHORIZATION.NO_PASSWORD'),
      t('AUTHORIZATION.NOT_TRIGGER_BLOCKCHAIN'),
    ].join(' ');
  }, [registration, t]);

  const requestAddress = useCallback(async () => {
    setIsLoading(true);
    const result = await ethRequest<string[]>(ETH_REQUEST_TYPES.REQUEST_ACCOUNTS);
    setIsLoading(false);
    if (!result) return;
    if (result.message) {
      setError(result.message);
      return;
    }
    if (result.data && result.data.length > 0) {
      setAddress(result.data[0] ?? null);
    }
  }, []);

  // Auto-request address once we know MM is installed.
  useEffect(() => {
    if (isInstalled) requestAddress();
  }, [isInstalled, requestAddress]);

  const sign = useCallback(async () => {
    if (!address) return null;
    const secretRes = await metamaskRequest(address);
    const secret = (secretRes.data as { secret?: string } | undefined)?.secret;
    if (!secret) {
      setError(
        t(
          'AUTHORIZATION.METAMASK.GET_SECRET_FAILED',
          "Couldn't reach the MetaMask sign-in service. Please try again.",
        ),
      );
      return null;
    }
    const msgParams = [
      { type: 'string', name: 'Message', value: message },
      { type: 'string', name: 'Your one time secret', value: secret },
    ];
    const signed = await ethRequest<string>(ETH_REQUEST_TYPES.REQUEST_SIGN_TYPED_DATA, [
      msgParams,
      address,
    ]);
    if (!signed || signed.message) {
      // Wallet-emitted message (signed?.message) is surfaced verbatim — it's
      // the user-actionable provider error (e.g. "User rejected request").
      // Only the catch-all "no signature returned" falls back to i18n copy.
      setError(
        signed?.message ??
          t(
            'AUTHORIZATION.METAMASK.SIGNATURE_FAILED',
            'Signature was rejected. Please approve the request in your wallet.',
          ),
      );
      return null;
    }
    return { sign: signed.data!, message: msgParams };
  }, [address, message, t]);

  const handleClick = useCallback(async () => {
    if (!address) {
      await requestAddress();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const signed = await sign();
      if (!signed) {
        setIsLoading(false);
        return;
      }

      const payload = {
        sign: signed.sign,
        address,
        message: signed.message,
        utmData: { ...getUtms() },
        landingPage: getLandingPage(),
      };

      const result = walletSetUp
        ? await metamaskSetUpWallet(payload)
        : await metamaskConfirm(payload);

      setIsLoading(false);

      if (result.status === 204) {
        if (walletSetUp) {
          onAuthSuccess();
          return;
        }
        // legacy: data?.code === FA_CODE_NEEDED → 2FA, else → login redirect.
        const data = result.data as { code?: string } | undefined;
        if (data?.code === '2FA_CODE_NEEDED') {
          onTwoFaRequired();
        } else {
          onAuthSuccess();
        }
        return;
      }

      const errorMsg =
        (result.data as { errorData?: { message?: string } })?.errorData?.message ??
        t(
          'AUTHORIZATION.METAMASK.AUTH_FAILED',
          'MetaMask sign-in failed. Please try again.',
        );
      setError(errorMsg);
    } catch (err) {
      setIsLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : t('AUTHORIZATION.METAMASK.AUTH_FAILED', 'MetaMask sign-in failed. Please try again.'),
      );
    }
  }, [address, sign, walletSetUp, onAuthSuccess, onTwoFaRequired, requestAddress, t]);

  const buttonText = useMemo(() => {
    if (isLoading) return t('AUTHORIZATION.METAMASK.BUTTON_PENDING', 'Pending');
    if (address && walletSetUp) return t('AUTHORIZATION.METAMASK.BUTTON_ACCESS', 'Access');
    if (address) return actionText;
    return t('AUTHORIZATION.METAMASK.BUTTON_UNLOCK', 'Unlock');
  }, [address, isLoading, actionText, walletSetUp, t]);

  return (
    <AuthorizationSection title={sectionTitle} className="metamask-login">
      <img
        src="/images/login/logo-metamask-big.svg"
        alt="metamask-logo"
        className="metamask-login__icon"
        decoding="async"
        width={120}
        height={120}
      />
      <div className="metamask-login__text">{message}</div>
      <NewButton className="metamask-login__button" onClick={handleClick} disabled={isLoading}>
        {buttonText}
      </NewButton>
      {error && <div className="metamask-login__error">{error}</div>}
    </AuthorizationSection>
  );
}
