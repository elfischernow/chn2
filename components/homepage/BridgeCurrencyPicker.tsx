'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Currency } from '@/lib/api/currencies';
import {
  getNetworkColor,
  getNetworkInk,
  getNetworkLabel,
} from '@/lib/network-colors';
import { Overlay } from '@/components/ui/Overlay';

import { Coin } from './Coin';
import { CoinTrigger } from './calculator/shared/CoinTrigger';

/**
 * Each chain has a canonical "native" currency whose iconUrl we reuse as
 * the chain logo (much better than a generic letter pip). EVM L2s
 * (Arbitrum, Optimism, Base, etc.) don't have a chain-native token, so
 * we fall through to the legacy multichain-bridge per-chain assets we
 * copied into `public/images/chains/`. Codes not in this map render the
 * colored letter fallback.
 */
const NATIVE_TICKER_BY_NETWORK: Readonly<Record<string, string>> = {
  btc: 'btc',
  eth: 'eth',
  bsc: 'bnb',
  bnb: 'bnb',
  trx: 'trx',
  sol: 'sol',
  matic: 'matic',
  pol: 'matic',
  ton: 'ton',
  xrp: 'xrp',
  ada: 'ada',
  algo: 'algo',
  near: 'near',
  xlm: 'xlm',
  xtz: 'xtz',
  ltc: 'ltc',
  doge: 'doge',
  bch: 'bch',
  dash: 'dash',
  zec: 'zec',
  xmr: 'xmr',
  atom: 'atom',
  dot: 'dot',
  ksm: 'ksm',
  fil: 'fil',
  flow: 'flow',
  hbar: 'hbar',
  icp: 'icp',
  vet: 'vet',
  egld: 'egld',
  sui: 'sui',
  apt: 'apt',
  sei: 'sei',
  inj: 'inj',
  kava: 'kava',
  rune: 'rune',
  avax: 'avax',
  avaxc: 'avax',
  cchain: 'avax',
  xchain: 'avax',
};

/**
 * Resolve a chain's icon URL by looking up the native currency's iconUrl
 * in the catalog. Falls back to scanning for any currency on the chain
 * with a matching ticker (covers chains where the native token is listed
 * but with a different ticker case). Returns `null` when nothing is
 * found, signalling the caller to render the letter fallback.
 */
function resolveChainIconUrl(
  network: string,
  currencies: readonly Currency[],
): string | null {
  const wantedTicker = NATIVE_TICKER_BY_NETWORK[network];
  if (wantedTicker) {
    const exact = currencies.find(
      (c) => c.network === network && c.currentTicker.toLowerCase() === wantedTicker,
    );
    if (exact?.iconUrl) return exact.iconUrl;
    // Same ticker on a different chain (e.g. ETH on Ethereum stand-in
    // for an L2 like Base) is a fine fallback — the icon is the same.
    const sameTicker = currencies.find(
      (c) => c.currentTicker.toLowerCase() === wantedTicker && !!c.iconUrl,
    );
    if (sameTicker?.iconUrl) return sameTicker.iconUrl;
  }
  return null;
}

/**
 * Bridge-mode currency picker. Two-pane modal: chains on the left, tokens
 * inside the active chain on the right. The same public contract as the
 * standard `CurrencyPicker` (`currencies`, `selectedTicker`,
 * `selectedNetwork`, `onSelect`, `amountSlot`) plus a `pairedTicker`
 * input that drives the chain-change auto-select rule:
 *
 *   "When the user picks a destination chain, auto-select the asset in
 *   that chain whose ticker matches the paired (FROM) ticker. Fall back
 *   to the chain's most popular asset if no match exists."
 *
 * The auto-select commits the (ticker, chain) pair and closes the modal,
 * so a chain click IS a picker selection — no extra step. Users who want
 * a different asset can explicitly click a token on the right pane.
 */
interface BridgeCurrencyPickerProps {
  currencies: readonly Currency[];
  selectedTicker: string;
  selectedNetwork?: string;
  onSelect: (c: Currency) => void;
  ariaLabel?: string;
  /** Fiat-only mode — Bridge never uses this (cross-chain crypto only). */
  fiatOnly?: boolean;
  /**
   * Ticker of the paired side (FROM ticker when this picker is mounted as
   * the TO selector, and vice versa). Drives the chain-change auto-select
   * rule above. When omitted, chain clicks just filter the right pane
   * without committing.
   */
  pairedTicker?: string;
  amountSlot: ReactNode;
}

interface ChainGroup {
  network: string;
  /** Display name from the network-colors registry, or upper-case fallback. */
  label: string;
  /** Brand color for the chain pip (used as letter-fallback bg). */
  color: string;
  /** Foreground tone for the letter-fallback pip. */
  ink: string;
  /** Real chain logo URL — resolved from the native currency's icon. */
  iconUrl: string | null;
  /** Currencies in this chain, sorted by `isPopular` then `position`. */
  currencies: readonly Currency[];
  /** True if at least one currency in the chain is `isPopular`. */
  isPopular: boolean;
  /** Lowest `position` among the chain's currencies — used as the
   *  popularity ranking when sorting chains by featured-ness. */
  topPosition: number;
}

const sortCurrencies = (a: Currency, b: Currency): number => {
  if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
  return (a.position ?? 9999) - (b.position ?? 9999);
};

const sortChains = (a: ChainGroup, b: ChainGroup): number => {
  // Promotion overrides ride alongside the upstream's `isPopular` flag
  // for sort purposes too, so a promoted chain (e.g. Solana) sits next
  // to the natively-popular ones rather than getting buried behind them.
  const aPop = a.isPopular || POPULAR_CHAIN_OVERRIDES.has(a.network);
  const bPop = b.isPopular || POPULAR_CHAIN_OVERRIDES.has(b.network);
  if (aPop !== bPop) return aPop ? -1 : 1;
  if (a.topPosition !== b.topPosition) return a.topPosition - b.topPosition;
  return a.label.localeCompare(b.label);
};

const groupByChain = (currencies: readonly Currency[]): ChainGroup[] => {
  const map = new Map<string, ChainGroup>();
  for (const c of currencies) {
    if (c.isFiat) continue;
    const network = (c.network ?? '').toLowerCase();
    if (!network) continue;
    let g = map.get(network);
    if (!g) {
      g = {
        network,
        label: getNetworkLabel(network) ?? network.toUpperCase(),
        color: getNetworkColor(network),
        ink: getNetworkInk(network),
        // Filled in after the loop when the full catalog is in scope.
        iconUrl: null,
        currencies: [],
        isPopular: false,
        topPosition: 9999,
      };
      map.set(network, g);
    }
    (g.currencies as Currency[]).push(c);
    if (c.isPopular) g.isPopular = true;
    if (c.position != null && c.position < g.topPosition) g.topPosition = c.position;
  }
  // Sort each chain's currencies, then return chains in popularity order.
  for (const g of map.values()) {
    (g.currencies as Currency[]).sort(sortCurrencies);
    g.iconUrl = resolveChainIconUrl(g.network, currencies);
  }
  return Array.from(map.values()).sort(sortChains);
};

// Number of chains we tag as "popular" for the left-pane header. Anything
// flagged `isPopular` slots in first; if there are fewer than this many,
// we promote the next chains by `topPosition`. Matches the screenshot's
// rough split (5-6 chains under "Popular Chains", the rest under "All").
const POPULAR_CHAINS_TARGET = 6;

// Hand-curated chain promotions. Solana and Optimism don't always carry
// an `isPopular` flag on the upstream catalog (their popularity rides on
// specific tokens rather than the chain itself), but as *bridge* surfaces
// they're firmly tier-one — both are listed in the Popular Chains
// section unconditionally. Add codes here when product wants a chain
// promoted regardless of the upstream's popularity ranking.
const POPULAR_CHAIN_OVERRIDES = new Set<string>(['sol', 'op']);

const splitPopularChains = (chains: readonly ChainGroup[]): {
  popular: ChainGroup[];
  rest: ChainGroup[];
} => {
  const popular = chains.filter(
    (c) => c.isPopular || POPULAR_CHAIN_OVERRIDES.has(c.network),
  );
  if (popular.length >= POPULAR_CHAINS_TARGET) {
    return { popular: popular.slice(0, POPULAR_CHAINS_TARGET), rest: chains.filter((c) => !popular.includes(c)) };
  }
  // Pad with the next-most-prominent chains by `topPosition`.
  const padded = [...popular];
  for (const c of chains) {
    if (padded.length >= POPULAR_CHAINS_TARGET) break;
    if (!padded.includes(c)) padded.push(c);
  }
  const rest = chains.filter((c) => !padded.includes(c));
  return { popular: padded, rest };
};

const filterChains = (chains: readonly ChainGroup[], query: string): ChainGroup[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [...chains];
  return chains.filter((c) =>
    c.label.toLowerCase().includes(q) ||
    c.network.toLowerCase().includes(q),
  );
};

const filterTokens = (
  tokens: readonly Currency[],
  query: string,
): Currency[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [...tokens];
  return tokens.filter((c) =>
    c.currentTicker.toLowerCase().includes(q) ||
    (c.name ?? '').toLowerCase().includes(q),
  );
};

export function BridgeCurrencyPicker({
  currencies,
  selectedTicker,
  selectedNetwork,
  onSelect,
  ariaLabel,
  pairedTicker,
  amountSlot,
}: BridgeCurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeChain, setActiveChain] = useState<string>(() =>
    (selectedNetwork ?? '').toLowerCase(),
  );
  const [chainQuery, setChainQuery] = useState('');
  const [tokenQuery, setTokenQuery] = useState('');
  const id = useId();

  // Sync the active chain to the currently-selected one each time the
  // modal opens — the user expects the modal to remember where they
  // were last, not stick to the chain they were browsing before closing.
  // Scroll-lock, Esc and outside-press dismissal are handled by `<Overlay>`.
  useEffect(() => {
    if (open) {
      setActiveChain((selectedNetwork ?? '').toLowerCase());
      setChainQuery('');
      setTokenQuery('');
    }
  }, [open, selectedNetwork]);

  const chains = useMemo(() => groupByChain(currencies), [currencies]);
  const { popular: popularChains, rest: restChains } = useMemo(
    () => splitPopularChains(chains),
    [chains],
  );

  const visiblePopularChains = useMemo(
    () => filterChains(popularChains, chainQuery),
    [popularChains, chainQuery],
  );
  const visibleRestChains = useMemo(
    () => filterChains(restChains, chainQuery),
    [restChains, chainQuery],
  );

  const activeChainGroup = useMemo(
    () => chains.find((c) => c.network === activeChain) ?? null,
    [chains, activeChain],
  );

  // Right-pane token list. The "All" chip (activeChain === '') flattens
  // every chain's coin list into one ranked list — `isPopular` first,
  // then by `position`. A specific chain filters to its own currencies.
  const activeChainCurrencies = useMemo(() => {
    if (activeChain === '') {
      const list: Currency[] = [];
      for (const g of chains) list.push(...g.currencies);
      return list.sort(sortCurrencies);
    }
    return activeChainGroup?.currencies ?? [];
  }, [activeChain, activeChainGroup, chains]);

  const visibleTokens = useMemo(
    () => filterTokens(activeChainCurrencies, tokenQuery),
    [activeChainCurrencies, tokenQuery],
  );

  // Selected currency for the trigger pill.
  const selected = useMemo(
    () =>
      currencies.find(
        (c) =>
          c.currentTicker.toLowerCase() === selectedTicker.toLowerCase() &&
          (selectedNetwork ? c.network === selectedNetwork.toLowerCase() : true),
      ) ?? null,
    [currencies, selectedTicker, selectedNetwork],
  );

  // Ticker we visually highlight on the right pane — `pairedTicker` when
  // present (so the bridge "auto-select" rule reads as "this is the asset
  // your paired side wants to bridge"), falling back to the currently-
  // selected ticker on this side. Doesn't commit anything; the user still
  // needs to click a row to confirm.
  const highlightedTicker = (pairedTicker ?? selectedTicker).toLowerCase();

  const commit = useCallback(
    (c: Currency) => {
      onSelect(c);
      setOpen(false);
    },
    [onSelect],
  );

  // Chain clicks ONLY filter the right pane — no auto-commit. The picker
  // emphasises the paired-ticker row inside the new chain (see
  // `highlightedTicker`) so the user's most-likely choice is one click
  // away, but they have to make that click themselves.
  const onChainClick = (chain: ChainGroup) => {
    setActiveChain(chain.network);
  };

  return (
    <div className="cur cur-bridge" data-open={open || undefined}>
      {/* Closed-state shell mirrors the standard CurrencyPicker: a 2-col
          grid with the amount input on the left and the trigger pill on
          the right. Without this wrapper the bridge picker stacks them
          vertically and visibly breaks the field rhythm of SwapView. */}
      <div className="cur-shell">
        <div className="cur-amount-slot" aria-hidden={open || undefined}>
          {amountSlot}
        </div>
        <CoinTrigger
          ticker={(selected?.currentTicker ?? selectedTicker).toUpperCase()}
          iconUrl={selected?.iconUrl ?? null}
          chainBadge={
            selected
              ? {
                  code: (getNetworkLabel(selected.network) ?? selected.network).toUpperCase(),
                  bg: getNetworkColor(selected.network),
                  fg: getNetworkInk(selected.network),
                }
              : null
          }
          open={open}
          ariaLabel={ariaLabel}
          ariaControls={id}
          onClick={() => setOpen(true)}
        />
      </div>

      <Overlay
        open={open}
        onOpenChange={setOpen}
        mode="modal"
        ariaLabel={ariaLabel ?? 'Select currency'}
        className="cur-bridge-modal"
      >
        <div id={id}>
          <header className="cur-bridge-head">
            <h2 className="cur-bridge-title">{ariaLabel ?? 'Select token'}</h2>
            <button
              type="button"
              className="cur-bridge-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          <div className="cur-bridge-grid">
            {/* ── Chains pane ─────────────────────────────────────────── */}
            <section className="cur-bridge-pane">
              <input
                className="cur-bridge-search"
                placeholder="Search Chains"
                value={chainQuery}
                onChange={(e) => setChainQuery(e.target.value)}
              />
              <ul className="cur-bridge-list" role="listbox">
                <li className="cur-bridge-chip-all">
                  <button
                    type="button"
                    className={`cur-bridge-row ${activeChain === '' ? 'cur-bridge-row-active' : ''}`}
                    onClick={() => setActiveChain('')}
                  >
                    <span className="cur-bridge-chain-pip cur-bridge-chain-pip-all" aria-hidden>
                      ◎
                    </span>
                    <span className="cur-bridge-row-label">All</span>
                  </button>
                </li>
                {visiblePopularChains.length > 0 && (
                  <li className="cur-bridge-section">Popular Chains</li>
                )}
                {visiblePopularChains.map((g) => (
                  <ChainRow
                    key={g.network}
                    chain={g}
                    active={activeChain === g.network}
                    onClick={() => onChainClick(g)}
                  />
                ))}
                {visibleRestChains.length > 0 && (
                  <li className="cur-bridge-section">All Chains</li>
                )}
                {visibleRestChains.map((g) => (
                  <ChainRow
                    key={g.network}
                    chain={g}
                    active={activeChain === g.network}
                    onClick={() => onChainClick(g)}
                  />
                ))}
              </ul>
            </section>

            {/* ── Tokens pane ─────────────────────────────────────────── */}
            <section className="cur-bridge-pane">
              <input
                className="cur-bridge-search"
                placeholder="Search Tokens"
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
              />
              <ul className="cur-bridge-list" role="listbox">
                {visibleTokens.length === 0 && (
                  <li className="cur-bridge-empty">No tokens on this chain.</li>
                )}
                {visibleTokens.map((c) => {
                  const isSelected =
                    !!selected
                    && selected.currentTicker === c.currentTicker
                    && selected.network === c.network;
                  // Highlight the paired-ticker row even when it's not the
                  // committed selection — bridge users mostly want the
                  // same asset on the new chain, so this prompt is doing
                  // most of the work the previous auto-commit did.
                  const isHighlighted =
                    !isSelected
                    && !!highlightedTicker
                    && c.currentTicker.toLowerCase() === highlightedTicker;
                  return (
                    <li key={`${c.currentTicker}:${c.network}`}>
                      {/* Token row reuses the regular `CurrencyPicker`'s
                          shape (Coin → bold ticker + faint full name →
                          coloured network badge on the right) so the
                          bridge picker and the standard picker read as
                          one component. Only the `cur-bridge-row*`
                          colours/spacing differ via CSS. */}
                      <button
                        type="button"
                        className={
                          'cur-bridge-row cur-bridge-row-token '
                          + (isSelected ? 'cur-bridge-row-active ' : '')
                          + (isHighlighted ? 'cur-bridge-row-highlight ' : '')
                        }
                        onClick={() => commit(c)}
                      >
                        <Coin
                          symbol={c.currentTicker}
                          iconUrl={c.iconUrl ?? null}
                          size={28}
                        />
                        <span className="cur-row-name">
                          <strong>{c.currentTicker.toUpperCase()}</strong>
                          <span className="cur-row-fullname">
                            {c.name || c.currentTicker.toUpperCase()}
                          </span>
                        </span>
                        {c.network && c.network !== c.currentTicker.toLowerCase() && (
                          <span
                            className="cur-row-network"
                            style={
                              {
                                '--net-color': getNetworkColor(c.network),
                                '--net-ink': getNetworkInk(c.network),
                              } as React.CSSProperties
                            }
                          >
                            {(getNetworkLabel(c.network) ?? c.network).toUpperCase()}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </Overlay>
    </div>
  );
}

function ChainRow({
  chain,
  active,
  onClick,
}: {
  chain: ChainGroup;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`cur-bridge-row cur-bridge-row-chain-row ${active ? 'cur-bridge-row-active' : ''}`}
        onClick={onClick}
      >
        {chain.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cur-bridge-chain-pip cur-bridge-chain-pip-img"
            src={chain.iconUrl}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            className="cur-bridge-chain-pip"
            style={{ background: chain.color, color: chain.ink }}
            aria-hidden
          >
            {chain.label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="cur-bridge-row-label">{chain.label}</span>
        {/* Coloured network code chip — same visual language as the
            right-pane token row's `cur-row-network` badge, so a user
            who learnt "TRX = red, SOL = teal" on the token list can
            scan the chains by the same colour. */}
        <span
          className="cur-row-network cur-bridge-row-chain-chip"
          style={
            {
              '--net-color': chain.color,
              '--net-ink': chain.ink,
            } as React.CSSProperties
          }
        >
          {chain.network.toUpperCase()}
        </span>
        {active && (
          <span className="cur-bridge-row-check" aria-hidden>
            ✓
          </span>
        )}
      </button>
    </li>
  );
}
