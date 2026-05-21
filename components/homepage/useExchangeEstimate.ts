'use client';

import { useEffect, useRef, useState } from 'react';

import {
  fetchEstimate,
  type EstimateError,
  type EstimateResponse,
  type EstimateType,
  type RateFlow,
} from '@/lib/api/exchange';

interface Args {
  from: string;
  to: string;
  /** Network for `from` — required for multi-network coins (USDT, etc.). */
  fromNetwork: string;
  /** Network for `to`. */
  toNetwork: string;
  amount: string;
  flow: RateFlow;
  /** "direct" — user typed in the FROM field; "reverse" — typed in TO. */
  type: EstimateType;
  /** Allow same-(ticker, network) queries to fall through to the upstream
   *  estimator. Default `false` because every other mode treats same-asset
   *  as a "pick a different currency to receive" UX error; private
   *  transfer is the one mode where same-asset IS the canonical flow
   *  (sender pays X, recipient gets X minus fees on the same chain) and
   *  needs a real fee quote. */
  allowSameAsset?: boolean;
  /** Optional `source` tag forwarded to the upstream estimator. Bridge
   *  mode passes `'bridge'` so the upstream routes through its cross-chain
   *  liquidity path; standard Swap leaves this `undefined` and lets the
   *  DAL default to `'site'`. */
  source?: string;
  /** Validated promo code forwarded as `promoCode=…` on the estimate query.
   *  When set + valid the upstream returns the discounted `toAmount`. Pass
   *  the trimmed 12-char code only when the upstream validation succeeded;
   *  the receive-amount comparison ("strikethrough non-promo vs. live
   *  discounted") relies on this. */
  promoCode?: string;
}

interface State {
  estimate: EstimateResponse | null;
  error: EstimateError | null;
  isLoading: boolean;
}

const DEBOUNCE_MS = 300;
// Re-quote the estimate every two minutes even with stable input. Aligned
// with the upstream's ~5-minute fixed-rate `validUntil` window so the
// `rateId` we hand to `/api/transactions` on submit is always within the
// validity envelope, with comfortable buffer for the network round-trip.
// Pairs with the rate-row countdown on Swap+Fixed / Convert+Fixed (which
// reads the same `validUntil`) so the timer never visibly underflows
// before we re-quote.
const REFRESH_MS = 120_000;

const parseAmount = (raw: string): number | null => {
  // Strip thin-space thousand separators (U+202F + regular whitespace) so
  // values formatted by the widget (e.g. "2 192 470.59") still parse, plus
  // tolerate the EU decimal comma.
  const trimmed = raw.replace(/[\s\u202F]/g, '').replace(',', '.').trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function useExchangeEstimate({
  from,
  to,
  fromNetwork,
  toNetwork,
  amount,
  flow,
  type,
  allowSameAsset = false,
  source,
  promoCode,
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

    const numeric = parseAmount(amount);
    if (!numeric) {
      // Synchronizing local state with an external invariant (input
      // unusable → no estimate). The compiler can't tell this isn't
      // derived state to be lifted; the early-return + setState pair is
      // the correct shape here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ estimate: null, error: null, isLoading: false });
      return;
    }
    if (from === to && fromNetwork === toNetwork && !allowSameAsset) {
      // Same ticker on the same network has no rate to quote in the
      // standard exchange flows — short-circuit with an explicit error
      // so the rate line surfaces it, rather than silently going blank
      // like the previous behavior (which the picker's `excludeTicker`
      // filter kept invisible). Cross-network same-ticker (USDT-TRX →
      // USDT-ETH) IS a real bridge flow and falls through to the
      // upstream estimator. The private-transfer mode opts out of this
      // guard via `allowSameAsset` because same-asset same-network is
      // the canonical flow there (sender pays X, recipient gets X
      // minus fees on the same chain).
      setState({
        estimate: null,
        error: { error: 'bad_request', message: 'Pick a different currency to receive' },
        isLoading: false,
      });
      return;
    }

    // Flip loading on synchronously so the skeleton appears the moment
    // the input changes — the debounce below is for the fetch only.
    setState((s) => ({ ...s, isLoading: true }));

    const run = async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const estimate = await fetchEstimate({
          from,
          to,
          fromNetwork,
          toNetwork,
          ...(type === 'direct' ? { fromAmount: numeric } : { toAmount: numeric }),
          flow,
          type,
          source,
          promoCode,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setState({ estimate, error: null, isLoading: false });
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Defensive normalize: the thrown body might have non-string fields
        // if the upstream surfaced a structured error. Always store strings
        // so the renderer can drop them into a `<span>` without checks.
        const raw = err as { error?: unknown; message?: unknown } | undefined;
        const safe = (v: unknown, fb: string): string => {
          if (typeof v === 'string' && v.trim()) return v;
          if (v && typeof v === 'object') {
            const inner = v as { message?: unknown };
            if (typeof inner.message === 'string' && inner.message.trim())
              return inner.message;
          }
          return fb;
        };
        const apiErr: EstimateError = {
          error: safe(raw?.error, 'unknown'),
          message: safe(raw?.message, safe(raw?.error, 'Something went wrong')),
        };
        setState({ estimate: null, error: apiErr, isLoading: false });
      }
    };

    debounceRef.current = setTimeout(run, DEBOUNCE_MS);
    refreshRef.current = setInterval(run, REFRESH_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [from, to, fromNetwork, toNetwork, amount, flow, type, allowSameAsset, source, promoCode]);

  return state;
}
