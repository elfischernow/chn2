'use client';

import { useRef } from 'react';

import { ExtraIdField } from '@/components/exchange/ExtraIdField';
import { WalletAddressField } from '@/components/exchange/WalletAddressField';
import type { Currency } from '@/lib/api/currencies';

import { CurrencyPicker } from '../../../CurrencyPicker';
import { amountSizeAttr, DECIMAL_RE, focusFieldInput } from '../../shared/utils';

interface PrivateViewProps {
  currencies: readonly Currency[];
  /** Active ticker (uppercase). */
  ticker: string;
  /** Active network (lowercase) — used to disambiguate multi-network
   *  tickers like USDT-TRC20 vs USDT-ERC20. */
  network: string;
  /** Direction of editing — `'reverse'` (default) means the user types
   *  the recipient amount and the orchestrator displays the send total
   *  in the rate row; `'direct'` flips it so the user types what they
   *  want to send. The flip toggle lives in the rate row alongside the
   *  computed value. */
  direction: 'direct' | 'reverse';
  /** The currently-editable amount — either fromAmount or toAmount
   *  depending on `direction`. The orchestrator routes setters to the
   *  right slice. */
  editableAmount: string;
  recipientAddress: string;
  recipientExtraId: string;
  /** Resolved Currency for the active (ticker, network). Drives whether
   *  the extra-id field renders and what label/placeholder to use. */
  currency: Currency | undefined;
  onSelectCurrency: (c: Currency) => void;
  onAmountChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onExtraIdChange: (value: string) => void;
  /** When `false` the address + extra-id inputs are not rendered — the
   *  parent surface owns them (e.g. /exchange's form section, where the
   *  same shared components sit alongside agreements + advanced fields).
   *  Defaults to `true` for the homepage SwapWidget where PrivateView is
   *  the whole compact widget. */
  embedAddressFields?: boolean;
}

/**
 * Private transfer mode view. Single-asset flow — both pickers control
 * the same `(ticker, network)` state, the recipient amount is the only
 * editable number (until the user flips direction), and the address
 * input is the shared `WalletAddressField` used elsewhere on /exchange.
 *
 * `embedAddressFields={false}` is the /exchange variant: the form
 * section already renders WalletAddressField + ExtraIdField + advanced
 * fields + agreements + CTA in a uniform stack across all inline modes,
 * so PrivateView only needs to render the calculator portion.
 */
export function PrivateView({
  currencies,
  ticker,
  network,
  direction,
  editableAmount,
  recipientAddress,
  recipientExtraId,
  currency,
  onSelectCurrency,
  onAmountChange,
  onAddressChange,
  onExtraIdChange,
  embedAddressFields = true,
}: PrivateViewProps) {
  const amountRef = useRef<HTMLInputElement>(null);

  const onAmountInput = (value: string) => {
    if (value !== '' && !DECIMAL_RE.test(value)) return;
    onAmountChange(value);
  };

  // Label flips with direction: the editable side is whichever the user
  // is currently typing into. The opposite (computed) side is shown in
  // the rate row below the field stack and carries the flip toggle.
  const editableLabel = direction === 'direct' ? 'You send' : 'Recipient gets';

  return (
    <>
      <div
        className="swap-field"
        onClick={(e) => focusFieldInput(e, amountRef.current)}
      >
        <div className="swap-label">
          <span>{editableLabel}</span>
          <span></span>
        </div>
        <CurrencyPicker
          currencies={currencies}
          selectedTicker={ticker}
          selectedNetwork={network}
          ariaLabel="Recipient currency"
          onSelect={onSelectCurrency}
          amountSlot={
            <div className="swap-input-wrap">
              <input
                ref={amountRef}
                className="swap-amount"
                data-size={amountSizeAttr(editableAmount)}
                value={editableAmount}
                onChange={(e) => onAmountInput(e.target.value)}
                inputMode="decimal"
              />
            </div>
          }
        />
      </div>

      {embedAddressFields && (
        <>
          <WalletAddressField
            ticker={ticker}
            addressRegex={currency?.addressRegex ?? null}
            value={recipientAddress}
            onChange={onAddressChange}
          />
          {currency?.hasExternalId && (
            <ExtraIdField
              fieldName={currency.externalIdName ?? 'Memo'}
              extraIdRegex={currency.extraIdRegex ?? null}
              value={recipientExtraId}
              onChange={onExtraIdChange}
            />
          )}
        </>
      )}
    </>
  );
}
