'use client';

// 1:1 port of the auth-relevant parts of legacy
// `react-ssr/dapp/providers/metamask/`. We drop the web3 / contract / token
// transfer helpers — those are only used by Pro pages, not by the
// auth flow. Auth needs only `eth_requestAccounts` and `eth_signTypedData`.

import { useEffect, useState } from 'react';

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
  // Brave-only — `navigator.brave.isBrave()` resolves true in Brave.
  interface Navigator {
    brave?: { isBrave: () => Promise<boolean> };
  }
}

export const ETH_REQUEST_TYPES = {
  REQUEST_ACCOUNTS: 'eth_requestAccounts',
  REQUEST_CHAIN_ID: 'eth_chainId',
  REQUEST_SIGN_TYPED_DATA: 'eth_signTypedData',
  REQUEST_PERSONAL_SIGN: 'personal_sign',
} as const;

export type EthRequestMethod =
  (typeof ETH_REQUEST_TYPES)[keyof typeof ETH_REQUEST_TYPES];

export interface EthRequestResult<T = unknown> {
  data?: T;
  /** From MM's RPC error envelope. */
  code?: number;
  /** From MM's RPC error envelope or thrown Error.message. */
  message?: string;
}

const isEthereumProviderInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window).ethereum);
};

const isMetaMaskProvider = (): boolean => {
  if (!isEthereumProviderInstalled()) return false;
  return Boolean((window as Window).ethereum?.isMetaMask);
};

export async function ethRequest<T = unknown>(
  method: EthRequestMethod | string,
  params: unknown[] = [],
): Promise<EthRequestResult<T> | null> {
  if (!isMetaMaskProvider()) return null;
  const response: EthRequestResult<T> = {};
  try {
    const result = (await window.ethereum!.request({ method, params })) as T;
    response.data = result;
  } catch (err) {
    const e = err as { code?: number; message?: string };
    response.code = e.code;
    response.message = e.message;
  }
  return response;
}

/** Hook: true once we've confirmed window.ethereum exists and isMetaMask. */
export function useMetamaskInstalled(): boolean {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(isMetaMaskProvider());
  }, []);
  return installed;
}

/** Hook: true if running in Brave (so we can show Brave logo on the button). */
export function useIsBraveBrowser(): boolean {
  const [isBrave, setIsBrave] = useState(false);
  useEffect(() => {
    navigator.brave
      ?.isBrave()
      .then((result: boolean) => setIsBrave(result))
      .catch(() => setIsBrave(false));
  }, []);
  return isBrave;
}
