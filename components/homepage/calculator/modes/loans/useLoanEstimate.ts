'use client';

import { useEffect, useRef, useState } from 'react';

import {
  fetchLoanEstimate,
  type LoanEstimateResponse,
  type LoanExchangeType,
} from '@/lib/api/coin-rabbit';

interface Args {
  fromCode: string;
  fromNetwork: string;
  toCode: string;
  toNetwork: string;
  amount: string;
  /** "direct" — user typed in the FROM (collateral) field; the upstream
   *  quotes the loan amount. "reverse" — user typed in the TO (loan)
   *  field; the upstream quotes the required collateral. */
  exchange: LoanExchangeType;
  /** When false, the hook stays idle (used when Loans mode isn't active
   *  but the hook is mounted at the orchestrator's top level — hook
   *  rules forbid conditional calls). */
  enabled: boolean;
}

interface State {
  estimate: LoanEstimateResponse | null;
  error: Error | null;
  isLoading: boolean;
}

const DEBOUNCE_MS = 300;
// Loan terms drift more slowly than spot rates — the legacy widget
// doesn't re-quote on a timer, but a soft refresh keeps a stale
// `validUntil`-style quote from sitting forever on an idle page.
const REFRESH_MS = 120_000;

const parseAmount = (raw: string): number | null => {
  const trimmed = raw.replace(/[\s ]/g, '').replace(',', '.').trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function useLoanEstimate({
  fromCode,
  fromNetwork,
  toCode,
  toNetwork,
  amount,
  exchange,
  enabled,
}: Args): State {
  const [state, setState] = useState<State>({
    estimate: null,
    error: null,
    isLoading: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!enabled) {
      // Sync state with the external invariant "Loans tab not active".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ estimate: null, error: null, isLoading: false });
      return;
    }

    const numeric = parseAmount(amount);
    if (!numeric || !fromCode || !toCode || !fromNetwork || !toNetwork) {
      setState({ estimate: null, error: null, isLoading: false });
      return;
    }

    setState((s) => ({ ...s, isLoading: true }));

    const run = async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const estimate = await fetchLoanEstimate({
          fromCode,
          fromNetwork,
          toCode,
          toNetwork,
          amount: numeric,
          exchange,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setState({ estimate, error: null, isLoading: false });
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setState({
          estimate: null,
          error: err instanceof Error ? err : new Error(String(err)),
          isLoading: false,
        });
      }
    };

    debounceRef.current = setTimeout(run, DEBOUNCE_MS);
    refreshRef.current = setInterval(run, REFRESH_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fromCode, fromNetwork, toCode, toNetwork, amount, exchange, enabled]);

  return state;
}
