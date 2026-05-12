'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Coin } from '@/components/homepage/Coin';
import { CoinTrigger } from '@/components/homepage/calculator/shared/CoinTrigger';
import type { LoanCurrency } from '@/lib/api/coin-rabbit';
import { getNetworkColor, getNetworkInk } from '@/lib/network-colors';

interface LoanCurrencyPickerProps {
  /** Pre-sorted list of loan currencies for this side (deposit or loan). */
  items: readonly LoanCurrency[];
  /** Selected ticker, lowercase. */
  selectedTicker: string;
  /** Selected network — required to disambiguate USDT-TRX vs USDT-ETH. */
  selectedNetwork: string;
  onSelect: (c: LoanCurrency) => void;
  ariaLabel?: string;
  /**
   * The amount input + skeleton, rendered in the picker's left slot when
   * closed. Same contract as the main `CurrencyPicker` so visual parity
   * holds via shared CSS (`cur` / `cur-shell` / `cur-amount-slot` / …).
   */
  amountSlot: ReactNode;
}

/**
 * Dedicated picker for the Loans flow. Visually identical to the main
 * `CurrencyPicker` (same CSS classes, same `<Coin>` / `<CoinTrigger>`
 * primitives) but with a simpler internal model — the Loans currency
 * list is small (~30 entries on each side) so the virtualization,
 * deferred search, ranked search index, and Popular/Stablecoins/All
 * grouping buckets that the main picker uses are overkill. Filter is
 * a flat substring match over ticker + name + network; no windowing.
 *
 * Why a separate component instead of generalizing `CurrencyPicker`:
 * the main picker is tuned for the ~1300-entry catalog (search index
 * build, intersection-observer windowing, popularity buckets keyed on
 * `Currency`-specific fields). Adapting it would cascade through
 * `groupCurrencies` / `buildSearchIndex` / `searchCurrencies`; a 120-line
 * purpose-built picker with shared CSS is the lower-risk path.
 */
export function LoanCurrencyPicker({
  items,
  selectedTicker,
  selectedNetwork,
  onSelect,
  ariaLabel,
  amountSlot,
}: LoanCurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listboxId = useId();

  const selectedTickerLower = selectedTicker.toLowerCase();
  const selectedNetworkLower = selectedNetwork.toLowerCase();

  const rows = useMemo(() => {
    if (!open) return [] as LoanCurrency[];
    const q = query.trim().toLowerCase();
    if (!q) return [...items];
    return items.filter((c) => {
      return (
        c.currentTicker.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.network.toLowerCase().includes(q)
      );
    });
  }, [items, query, open]);

  const selected = useMemo(() => {
    const exact = items.find(
      (c) =>
        c.currentTicker.toLowerCase() === selectedTickerLower &&
        c.network.toLowerCase() === selectedNetworkLower,
    );
    if (exact) return exact;
    return items.find((c) => c.currentTicker.toLowerCase() === selectedTickerLower) ?? null;
  }, [items, selectedTickerLower, selectedNetworkLower]);

  useEffect(() => {
    if (activeIndex == null) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const closePopover = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(null);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setActiveIndex(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const commit = (c: LoanCurrency) => {
    onSelect(c);
    closePopover();
  };

  const openPopover = () => {
    setQuery('');
    const exactIdx = items.findIndex(
      (c) =>
        c.currentTicker.toLowerCase() === selectedTickerLower &&
        c.network.toLowerCase() === selectedNetworkLower,
    );
    const tickerIdx =
      exactIdx >= 0
        ? exactIdx
        : items.findIndex((c) => c.currentTicker.toLowerCase() === selectedTickerLower);
    setActiveIndex(tickerIdx >= 0 ? tickerIdx : items.length > 0 ? 0 : null);
    setOpen(true);
  };

  const moveActive = (dir: 1 | -1) => {
    setActiveIndex((prev) => {
      if (rows.length === 0) return null;
      let i = prev == null ? (dir === 1 ? -1 : rows.length) : prev;
      i += dir;
      if (i < 0) return 0;
      if (i >= rows.length) return rows.length - 1;
      return i;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter') {
      if (activeIndex == null) return;
      const row = rows[activeIndex];
      if (row) {
        e.preventDefault();
        commit(row);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
    }
  };

  const onTriggerClick = () => {
    if (open) closePopover();
    else openPopover();
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
  };

  const triggerLabel = (selected?.currentTicker ?? selectedTicker).toUpperCase();
  const triggerIconUrl = selected?.iconUrl ?? null;
  const triggerChainBadge =
    selected && selected.network && selected.network !== selected.currentTicker
      ? {
          code: selected.network.toUpperCase(),
          bg: getNetworkColor(selected.network),
          fg: getNetworkInk(selected.network),
        }
      : null;

  return (
    <div className="cur" data-open={open || undefined} ref={containerRef}>
      <div className="cur-shell">
        <div className="cur-amount-slot" aria-hidden={open || undefined}>
          {amountSlot}
        </div>

        <div className="cur-search-slot" aria-hidden={!open || undefined}>
          <svg
            className="cur-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className="cur-search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by name, ticker, or network"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex != null ? `${listboxId}-${activeIndex}` : undefined
            }
            tabIndex={open ? 0 : -1}
          />
        </div>

        <CoinTrigger
          ticker={triggerLabel}
          iconUrl={triggerIconUrl}
          chainBadge={triggerChainBadge}
          open={open}
          ariaLabel={ariaLabel}
          ariaControls={listboxId}
          onClick={onTriggerClick}
        />
      </div>

      {open && (
        <ul
          id={listboxId}
          className="cur-list"
          role="listbox"
          aria-label={ariaLabel ?? 'Currency'}
        >
          {rows.length === 0 ? (
            <li className="cur-empty">No matches</li>
          ) : (
            rows.map((row, i) => {
              const isActive = i === activeIndex;
              const isSelected =
                row.currentTicker.toLowerCase() === selectedTickerLower &&
                row.network.toLowerCase() === selectedNetworkLower;
              return (
                <li
                  key={`${row.ticker}-${row.network}-${i}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  id={`${listboxId}-${i}`}
                  className="cur-row cur-row-item"
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive || undefined}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(row);
                  }}
                >
                  <Coin symbol={row.currentTicker.toUpperCase()} iconUrl={row.iconUrl} />
                  <span className="cur-row-name">
                    <strong>{row.currentTicker.toUpperCase()}</strong>
                    <span className="cur-row-fullname">{row.name}</span>
                  </span>
                  {row.network && row.network !== row.currentTicker && (
                    <span
                      className="cur-row-network"
                      style={
                        {
                          '--net-color': getNetworkColor(row.network),
                          '--net-ink': getNetworkInk(row.network),
                        } as React.CSSProperties
                      }
                    >
                      {row.network.toUpperCase()}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
