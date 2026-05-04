'use client';

import { useEffect, useState, useTransition } from 'react';

import { SwapWidget } from '@/components/homepage/SwapWidget';
import type { Currency } from '@/lib/api/currencies';

interface Props {
  currencies: readonly Currency[];
  /** Pre-fill the FROM ticker. Comes from the page's currency. */
  fromTicker: string;
  fromNetwork?: string;
  /** Pre-fill the TO ticker. Set on pair pages; coin pages let the widget pick a default. */
  toTicker?: string;
  toNetwork?: string;
}

/**
 * Thin wrapper around the homepage `SwapWidget` that pre-fills FROM/TO via
 * the URL hash before the widget mounts. The widget reads `from`/`to` (and
 * optional networks) from `location.hash` on first effect — so we set them
 * synchronously here before paint to avoid a flicker.
 *
 * Does nothing if the URL already has a hash (user-supplied state wins).
 *
 * Why hash and not props: the widget owns its state via `useHashSync`. Adding
 * an `initialFrom` prop would force a parallel pathway through the widget;
 * piggy-backing on the hash is one less code-path to maintain. The trade-off
 * is that the URL gets a mode-marker hash (`#from=btc&to=eth&mode=…`) on
 * first mount — acceptable for a coin page where this state IS the intent.
 */
export function PresetSwapWidget({
  currencies,
  fromTicker,
  fromNetwork,
  toTicker,
  toNetwork,
}: Props) {
  const [, startTransition] = useTransition();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash) {
      const params = new URLSearchParams();
      params.set('from', fromTicker);
      if (fromNetwork) params.set('fromNetwork', fromNetwork);
      if (toTicker) {
        params.set('to', toTicker);
        if (toNetwork) params.set('toNetwork', toNetwork);
      }
      const target = `${window.location.pathname}${window.location.search}#${params.toString()}`;
      window.history.replaceState(null, '', target);
    }
    startTransition(() => setReady(true));
  }, [fromTicker, fromNetwork, toTicker, toNetwork]);

  // Render immediately — the widget will read the hash on its own mount
  // effect, so the preset is in place by the time it boots. `ready` is
  // kept so the component re-renders after the hash is applied if state
  // ordering ever drifts; it's a belt-and-braces guard, not a gate.
  void ready;
  return <SwapWidget currencies={currencies} />;
}
