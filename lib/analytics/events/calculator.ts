// Calculator-zone events. Categories follow legacy GA4 dashboards:
//   - 'main' for the homepage swap widget (see EVENT_TYPES.MAIN)
//   - 'exchange' for the standalone /exchange page

import { trackEvent } from '../track';

type Side = 'from' | 'to';
type Mode = 'swap' | 'buy' | 'sell' | 'convert' | 'private' | 'loans' | 'bridge';

export const calculatorEvents = {
  selectCoin(side: Side, ticker: string): void {
    trackEvent({
      category: 'main',
      action: 'calculator_select_coin',
      label: `${side}:${ticker}`,
    });
  },
  changeAmount(side: Side, amount: string | number): void {
    trackEvent({
      category: 'main',
      action: 'calculator_change_amount',
      label: side,
      value: typeof amount === 'number' ? amount : Number(amount) || undefined,
    });
  },
  switchDirection(): void {
    trackEvent({ category: 'main', action: 'calculator_switch_direction' });
  },
  tabChange(mode: Mode): void {
    trackEvent({ category: 'main', action: 'calculator_tab_change', label: mode });
  },
  exchangeClick(from: string, to: string): void {
    trackEvent({
      category: 'main',
      action: 'calculator_exchange_click',
      label: `${from}->${to}`,
    });
  },
  pairUnavailable(from: string, to: string): void {
    trackEvent({
      category: 'main',
      action: 'swap_unavailable_coin',
      label: `${from}->${to}`,
    });
  },
} as const;
