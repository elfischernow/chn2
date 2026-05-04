'use client';

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Currency } from '@/lib/api/currencies';
import { groupCurrencies, searchRows, type CurrencyRow } from '@/lib/currencies/group';
import { buildSearchIndex, searchCurrencies } from '@/lib/currencies/search';
import { getNetworkColor, getNetworkInk } from '@/lib/network-colors';

import { Coin } from './Coin';
import { CoinTrigger } from './calculator/shared/CoinTrigger';

// Soft cap on rows we paint synchronously. The picker holds ~1300 currencies;
// rendering the full set on open spends ~50ms on icon-heavy DOM creation
// before the first frame. We render the first slice eagerly and reveal the
// rest via IntersectionObserver as the user scrolls down.
const INITIAL_ROW_BUDGET = 200;
const ROW_BUDGET_STEP = 200;

interface CurrencyPickerProps {
  currencies: readonly Currency[];
  selectedTicker: string;
  /** Network code of the selected coin — required to disambiguate
   *  multi-chain tickers (USDT-TRX vs USDT-ETH, ETH-eth vs ETH-base). The
   *  trigger looks up `selected` by `(ticker, network)` so the closed-state
   *  pill always reflects the actual chain the parent state holds, not just
   *  whichever variant happens to be first in the catalog. */
  selectedNetwork?: string;
  onSelect: (c: Currency) => void;
  /** ARIA label for the closed-state trigger. */
  ariaLabel?: string;
  /** Render a lock icon instead of the dropdown caret (fixed-rate mode). */
  /**
   * @deprecated Lock affordance moved out of the trigger and into the
   * amount slot — see `LockBadge` in `SwapWidget`. Prop retained as a
   * no-op so callers compile while migrating.
   */
  showLock?: boolean;
  /** When true, surface fiats only. */
  fiatOnly?: boolean;
  /**
   * The amount input + skeleton, rendered in the picker's left slot when
   * closed. Lifting it into the picker lets the open-state search bar slide
   * in over the same physical region without portals or layout flicker.
   */
  amountSlot: ReactNode;
}

const isItem = (row: CurrencyRow): row is Currency => typeof row !== 'string';

const findFirstItemIndex = (rows: readonly CurrencyRow[]): number | null => {
  for (let i = 0; i < rows.length; i++) {
    if (isItem(rows[i]!)) return i;
  }
  return null;
};

export function CurrencyPicker({
  currencies,
  selectedTicker,
  selectedNetwork,
  onSelect,
  ariaLabel,
  showLock = false,
  fiatOnly = false,
  amountSlot,
}: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Decouple the search input from the heavy ranking work — the input stays
  // responsive while the list re-renders against the deferred value. React
  // keeps the previous `rows` painted until the new ones are ready.
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Pair the budget with the input identity so a fresh search restarts the
  // windowing without bouncing through a setState-in-effect: when either of
  // those inputs flips identity, we adjust state during render — React
  // supports that for initialization-on-input-change without the
  // cascading-render warning.
  const [budgetState, setBudgetState] = useState<{
    indexRef: object | null;
    queryRef: string;
    budget: number;
  }>({
    indexRef: null,
    queryRef: '',
    budget: INITIAL_ROW_BUDGET,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const sentinelRef = useRef<HTMLLIElement | null>(null);

  const listboxId = useId();
  const selectedTickerLower = selectedTicker.toLowerCase();
  const selectedNetworkLower = selectedNetwork?.toLowerCase();

  const visible = useMemo(() => {
    return currencies.filter((c) => (fiatOnly ? c.isFiat : !c.isFiat));
  }, [currencies, fiatOnly]);

  // Build the searchable index lazily — `buildSearchIndex` walks the
  // ~1300-entry catalog and normalizes each row's strings, which costs
  // 5-15ms per picker on hydration. Gating on `open` defers that work
  // until the first time the user opens the picker (typically never on
  // the initial visit) so the cold-render path stays light. Once built,
  // useMemo's cache holds it across re-renders for the same `visible`
  // slice; closing → reopening rebuilds, which is fine — the user only
  // pays it on a manual reopen.
  const searchIndex = useMemo(
    () => (open ? buildSearchIndex(visible) : null),
    [open, visible],
  );

  // Compute rows for an arbitrary query. Used both for render and for event
  // handlers that need to predict next-render rows synchronously (so we can
  // set `activeIndex` without bouncing through a setState-in-effect).
  const computeRows = (q: string): CurrencyRow[] => {
    const trimmed = q.trim();
    if (!trimmed) return groupCurrencies(visible);
    // Fall back to the unranked grouping when the index isn't ready yet
    // (e.g. handler called from `openPopover` before the open-gated
    // useMemo has run). In practice the seeded query is empty in that
    // path, so this branch is rare but keeps the contract honest.
    return searchIndex
      ? searchRows(searchCurrencies(searchIndex, trimmed))
      : groupCurrencies(visible);
  };

  const rows = useMemo<CurrencyRow[]>(
    () => (open ? computeRows(deferredQuery) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, visible, searchIndex, deferredQuery],
  );

  // Reset the budget when the underlying input changes (different filter
  // set or query). Adjusting state in render against a derived key is the
  // React-blessed alternative to setting it in an effect.
  const inputChanged =
    budgetState.indexRef !== searchIndex || budgetState.queryRef !== deferredQuery;
  if (inputChanged) {
    setBudgetState({
      indexRef: searchIndex,
      queryRef: deferredQuery,
      budget: INITIAL_ROW_BUDGET,
    });
  }
  const renderBudget = inputChanged ? INITIAL_ROW_BUDGET : budgetState.budget;

  // Slice the row list for paint. Headers + items are interleaved, so we
  // count items only against the budget — header strings cost almost nothing
  // and look bad when they appear on a chunk boundary without their bucket.
  const paintRows = useMemo<CurrencyRow[]>(() => {
    if (rows.length <= renderBudget) return rows;
    let items = 0;
    let cut = 0;
    for (let i = 0; i < rows.length; i++) {
      if (typeof rows[i] !== 'string') {
        items += 1;
        if (items > renderBudget) break;
      }
      cut = i + 1;
    }
    return rows.slice(0, cut);
  }, [rows, renderBudget]);

  // Reveal additional rows when the sentinel comes into view. Cheaper and
  // more idiomatic than a scroll listener; falls back gracefully when the
  // observer API is missing (older WebViews) by simply not paginating.
  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startTransition(() =>
              setBudgetState((prev) => ({
                ...prev,
                budget: prev.budget + ROW_BUDGET_STEP,
              })),
            );
          }
        }
      },
      { root: sentinel.parentElement ?? null, rootMargin: '200px 0px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [open, paintRows.length]);

  const selected = useMemo(() => {
    // Prefer an exact (ticker, network) match — without it, picking
    // ETH-Base would resolve to whichever ETH variant is first in the
    // catalog (usually ETH-eth) and the trigger would silently misreport
    // the chain. Fall back to ticker-only when the parent didn't pass a
    // network (legacy callers, or genuinely-unmapped tickers).
    if (selectedNetworkLower) {
      const exact = currencies.find(
        (c) => c.currentTicker === selectedTickerLower && c.network === selectedNetworkLower,
      );
      if (exact) return exact;
    }
    return currencies.find((c) => c.currentTicker === selectedTickerLower) ?? null;
  }, [currencies, selectedTickerLower, selectedNetworkLower]);

  // Scroll highlighted row into view.
  useEffect(() => {
    if (activeIndex == null) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Auto-focus the search input the moment the picker opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click / touch.
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

  const moveActive = (dir: 1 | -1) => {
    setActiveIndex((prev) => {
      if (rows.length === 0) return null;
      let i = prev == null ? (dir === 1 ? -1 : rows.length) : prev;
      for (let step = 0; step < rows.length; step++) {
        i += dir;
        if (i < 0 || i >= rows.length) return prev;
        if (isItem(rows[i]!)) return i;
      }
      return prev;
    });
  };

  const closePopover = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(null);
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
      if (row && isItem(row)) {
        e.preventDefault();
        commit(row);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
    }
  };

  const commit = (c: Currency) => {
    onSelect(c);
    closePopover();
  };

  const openPopover = () => {
    setQuery('');
    const initialRows = groupCurrencies(visible);
    // Prefer the exact (ticker, network) row so opening the picker on
    // ETH-Base highlights the Base row, not whichever ETH variant is first.
    let idx = -1;
    if (selectedNetworkLower) {
      idx = initialRows.findIndex(
        (r) =>
          isItem(r) &&
          r.currentTicker === selectedTickerLower &&
          r.network === selectedNetworkLower,
      );
    }
    if (idx < 0) {
      idx = initialRows.findIndex(
        (r) => isItem(r) && r.currentTicker === selectedTickerLower,
      );
    }
    setActiveIndex(idx >= 0 ? idx : findFirstItemIndex(initialRows));
    setOpen(true);
  };

  const onTriggerClick = () => {
    if (open) closePopover();
    else openPopover();
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    setActiveIndex(findFirstItemIndex(computeRows(next)));
  };

  const triggerLabel = (selected?.currentTicker ?? selectedTicker).toUpperCase();
  const triggerIconUrl = selected?.iconUrl ?? null;
  // Build the chain chip the same way the listbox row does (uppercase
  // network code + brand color), so the closed-state pill mirrors the
  // open-state row visually. Single-network coins (BTC, ETH, …) skip the
  // chip — for them the ticker alone identifies the asset, and the chip
  // would just repeat what the user already sees.
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
        {/* Amount slot — visible when closed. Fades out when the picker
            opens; the search bar slides in over the same grid cell. */}
        <div className="cur-amount-slot" aria-hidden={open || undefined}>
          {amountSlot}
        </div>

        {/* Search bar — sits in the same grid cell as the amount, slides in
            from the right when the picker opens. Always rendered so the CSS
            transition has a stable target; pointer-events gate interaction
            until the slide finishes. */}
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

        {/* Trigger pill / close button — extracted to `<CoinTrigger>` so
            future modes (private, bridge, …) can swap the visual without
            cloning the picker shell. */}
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
            <>
              {paintRows.map((row, i) => {
                if (typeof row === 'string') {
                  return (
                    <li
                      key={`h-${i}-${row}`}
                      className="cur-row cur-row-header"
                      role="presentation"
                    >
                      {row}
                    </li>
                  );
                }
                const isActive = i === activeIndex;
                const isSelected =
                  row.currentTicker === selectedTickerLower &&
                  (selectedNetworkLower == null || row.network === selectedNetworkLower);
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
                        // CSS reads `--net-color` and `--net-ink` to paint
                        // the badge in the chain's brand color. Mirrors the
                        // legacy SPA's `currencyNetwork.color` injection,
                        // but the table is local (`lib/network-colors.ts`)
                        // because the homepage doesn't fetch the networks
                        // catalog. Same code path covers light and dark
                        // theme — saturated brand colors read identically
                        // on either backdrop.
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
              })}
              {paintRows.length < rows.length && (
                <li
                  ref={sentinelRef}
                  className="cur-row cur-row-sentinel"
                  role="presentation"
                  aria-hidden
                  style={{ height: 1 }}
                />
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
