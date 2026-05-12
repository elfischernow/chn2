'use client';

import { useEffect, useState } from 'react';

import {
  fetchCoinRabbitCurrencies,
  type LoanCurrencyLists,
} from '@/lib/api/coin-rabbit';

interface State {
  lists: LoanCurrencyLists | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch the (deposit, loan) currency lists once per mount. Backed by a
 * module-level cache in `lib/api/coin-rabbit.ts` so re-mounts within
 * the TTL window resolve synchronously without hitting the network.
 *
 * No filtering happens here — the Loans calculator surfaces both lists
 * verbatim. The legacy `is_stable` split (Bull / Bear tabs) is
 * intentionally retired.
 */
export function useLoanCurrencies(enabled: boolean = true): State {
  const [state, setState] = useState<State>({
    lists: null,
    isLoading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const controller = new AbortController();
    // Flip loading on synchronously so the skeleton appears the moment
    // the user opens the Loans tab — the fetch resolves a moment later.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => (s.lists ? s : { ...s, isLoading: true }));
    fetchCoinRabbitCurrencies({ signal: controller.signal })
      .then((lists) => {
        if (cancelled) return;
        setState({ lists, isLoading: false, error: null });
      })
      .catch((err) => {
        if (cancelled || (err as { name?: string })?.name === 'AbortError') return;
        setState({
          lists: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return state;
}
