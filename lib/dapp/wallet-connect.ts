'use client';

// Auth-only WalletConnect hook. Slim port of legacy
// `react-ssr/dapp/providers/walletconnect/hooks/use-wallet-connect.js` —
// drops web3 / sendTransaction / getBalance / switchNetwork (pro-page concerns).
//
// We need only: init() → provider, connect() → address, disconnect(),
// `provider.request({ method: 'personal_sign', params })` for signing.
// Lazy-imports `@walletconnect/ethereum-provider` so its 800kb hot-bundle
// doesn't land on every page (only when the user actually clicks the WC
// button on /authorization).

import { useCallback, useMemo, useState } from 'react';

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? '';

const DEFAULT_OPTIONAL_CHAINS = [5, 56, 137, 10, 100];
const ETH_NETWORK_ID = 1;

type EthereumProviderShape = {
  accounts?: string[];
  chainId?: number;
  connected: boolean;
  session: unknown;
  request: (args: { method: string; params: unknown }) => Promise<unknown>;
  enable: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (data?: unknown) => void) => void;
};

let EthereumProviderClass: { init: (config: unknown) => Promise<EthereumProviderShape> } | null = null;

const importEthereumProvider = async () => {
  if (EthereumProviderClass) return EthereumProviderClass;
  const mod = await import('@walletconnect/ethereum-provider');
  EthereumProviderClass = mod.EthereumProvider as unknown as typeof EthereumProviderClass;
  return EthereumProviderClass!;
};

export interface UseWalletConnectReturn {
  provider: EthereumProviderShape | null;
  /** First account address, ready to sign. */
  address: string | null;
  /** True when the current session has at least one account. */
  connected: boolean;
  /** Sticky last error message from connect/disconnect. */
  error: string | null;
  /** Lazy-init the WC provider. Returns it (or null on error). */
  init: () => Promise<EthereumProviderShape | null>;
  /** Connect via QR-modal (or restored session). Returns address. */
  connect: (
    isAuth?: boolean,
    initialised?: EthereumProviderShape | null,
  ) => Promise<string | null>;
  disconnect: () => Promise<void>;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const [provider, setProvider] = useState<EthereumProviderShape | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connected = useMemo(() => {
    if (!provider) return false;
    return Boolean(provider.connected && provider.session && address);
  }, [provider, address]);

  const init = useCallback(async () => {
    if (!PROJECT_ID) {
      setError('WalletConnect not configured');
      return null;
    }
    try {
      const Cls = await importEthereumProvider();
      const next = await Cls.init({
        projectId: PROJECT_ID,
        chains: [ETH_NETWORK_ID],
        optionalChains: DEFAULT_OPTIONAL_CHAINS,
        showQrModal: true,
        qrModalOptions: {
          themeVariables: {
            '--wcm-z-index': 2000,
            '--wcm-font-family': 'Roboto, Arial, Helvetica, sans-serif',
            '--wcm-accent-color': '#00C26F',
          },
        },
      });
      next.on('disconnect', () => {
        setProvider(null);
        setAddress(null);
      });
      next.on('connect', () => {
        if (Array.isArray(next.accounts) && next.accounts.length > 0) {
          setAddress(next.accounts[0] ?? null);
        }
      });
      setProvider(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WalletConnect init failed');
      return null;
    }
  }, []);

  const connect = useCallback(
    async (
      isAuth?: boolean,
      initialised?: EthereumProviderShape | null,
    ): Promise<string | null> => {
      let result: string | null = null;
      try {
        setError(null);
        let target = initialised ?? null;
        if (!target) {
          if (isAuth && provider) target = provider;
          else if (provider?.session && address) target = provider;
          else target = await init();
        }
        if (!target) return null;
        if (!target.session) {
          const enabled = await target.enable();
          if (Array.isArray(enabled) && enabled.length > 0) {
            setAddress(enabled[0]!);
            result = enabled[0]!;
          }
        }
        if (target.session && target.connected) {
          if (Array.isArray(target.accounts) && target.accounts.length > 0) {
            setAddress(target.accounts[0]!);
            result = target.accounts[0]!;
          }
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'WalletConnect connect failed');
        return null;
      }
    },
    [provider, address, init],
  );

  const disconnect = useCallback(async () => {
    try {
      const target = provider ?? (await init());
      if (target) await target.disconnect();
    } catch {
      // ignore
    }
    setProvider(null);
    setAddress(null);
  }, [provider, init]);

  return {
    provider,
    address,
    connected,
    error,
    init,
    connect,
    disconnect,
  };
}

/** UTF-8 → 0x-prefixed hex string (replaces legacy convertUtf8ToHex). */
export function utf8ToHex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let out = '0x';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}
