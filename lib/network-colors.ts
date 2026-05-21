// Brand colors for the most common chains. Mirrors the legacy SPA's
// runtime `currencyNetwork.color` (server-fetched) — but since the
// homepage doesn't load the networks API, we ship the table inline.
// The legacy fallback `#B2BFD0` is preserved for unmapped tickers.
//
// Some chains have very light brand colors (yellow, mint green, cyan)
// where white text fails the WCAG contrast floor; those are listed in
// `LIGHT_BG_NETWORKS` so the consumer can pick a dark text color
// instead. All others use white text against the saturated brand bg.

const NETWORK_COLORS: Readonly<Record<string, string>> = {
  // Major chains
  btc: '#F7931A',
  eth: '#627EEA',
  trx: '#FF060A',
  bsc: '#F0B90B',
  bnb: '#F0B90B',
  sol: '#9945FF',
  matic: '#8247E5',
  pol: '#8247E5',

  // EVM L2s / sidechains
  base: '#0052FF',
  arbitrum: '#28A0F0',
  arb: '#28A0F0',
  op: '#FF0420',
  opbnb: '#FF0420',
  lna: '#121212',
  linea: '#121212',

  // Avalanche family
  cchain: '#E84142',
  xchain: '#E84142',
  avaxc: '#E84142',
  avax: '#E84142',

  // Other L1s / chains
  ton: '#0098EA',
  xrp: '#00AAE4',
  ada: '#0033AD',
  algo: '#000000',
  near: '#00C08B',
  xlm: '#14B8FF',
  xtz: '#2C7DF7',
  ltc: '#345D9D',
  doge: '#C2A633',
  bch: '#0AC18E',
  dash: '#008CE7',
  zec: '#F4B728',
  xmr: '#FF6600',
  atom: '#2E3148',
  dot: '#E6007A',
  ksm: '#000000',
  fil: '#0090FF',
  flow: '#00EF8B',
  hbar: '#000000',
  icp: '#3B00B9',
  vet: '#15BDFF',
  egld: '#1B46C2',
  hyper: '#97FCE4',
  sui: '#4DA1F9',
  apt: '#171717',
  sei: '#9E1F19',
  inj: '#082431',
  kava: '#FF433E',
  rune: '#33FF99',
};

const DEFAULT_NETWORK_COLOR = '#B2BFD0';

// Networks whose brand color is light enough that white text fails
// contrast — switch to dark text on these. `sol`'s `#9945FF` is dark
// enough for white text (~4.6:1) and matches Solana's own brand
// treatment, so it stays out of this set even though it sits in the
// mid-luminance range. `algo` is intentionally absent too — its brand
// is `#000000` (black), so white text is the only legible choice.
const LIGHT_BG_NETWORKS = new Set(['bsc', 'bnb', 'rune', 'hyper']);

/**
 * Returns the brand background color for a network ticker. Falls back to
 * the neutral grey legacy `DEFAULT_NETWORK_COLOR` when unmapped. Case
 * insensitive — picker rows hand us tickers like `'TRC20'` already
 * uppercased; we lowercase before lookup.
 */
export function getNetworkColor(network: string | null | undefined): string {
  if (!network) return DEFAULT_NETWORK_COLOR;
  return NETWORK_COLORS[network.toLowerCase()] ?? DEFAULT_NETWORK_COLOR;
}

/**
 * Picks a foreground color that contrasts against the network's brand
 * background. Most networks are saturated enough for white; the
 * `LIGHT_BG_NETWORKS` set returns a near-black instead so the badge
 * stays legible.
 */
export function getNetworkInk(network: string | null | undefined): string {
  if (!network) return '#fff';
  return LIGHT_BG_NETWORKS.has(network.toLowerCase()) ? '#1A1A1A' : '#fff';
}

// Display names for the chains we want to render with their proper
// capitalization. Codes not listed here fall back to upper-case (e.g.
// `arbitrum` → `Arbitrum` via fallback rule, `trx` → `TRX`). Keep this
// small and curated — the goal isn't a complete chain registry, just to
// avoid `Trx` and `Bsc` reading like typos in the trigger pill.
const NETWORK_LABELS: Readonly<Record<string, string>> = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
  bsc: 'BNB Chain',
  bnb: 'BNB Chain',
  sol: 'Solana',
  matic: 'Polygon',
  pol: 'Polygon',
  base: 'Base',
  arbitrum: 'Arbitrum',
  arb: 'Arbitrum',
  op: 'Optimism',
  opbnb: 'opBNB',
  linea: 'Linea',
  lna: 'Linea',
  cchain: 'Avalanche',
  xchain: 'Avalanche',
  avaxc: 'Avalanche',
  avax: 'Avalanche',
  ton: 'TON',
  trx: 'Tron',
  xrp: 'XRP',
  ada: 'Cardano',
  near: 'NEAR',
  xlm: 'Stellar',
  xtz: 'Tezos',
  ltc: 'Litecoin',
  doge: 'Dogecoin',
  bch: 'Bitcoin Cash',
  dash: 'Dash',
  zec: 'Zcash',
  xmr: 'Monero',
  atom: 'Cosmos',
  dot: 'Polkadot',
  ksm: 'Kusama',
  fil: 'Filecoin',
  flow: 'Flow',
  hbar: 'Hedera',
  icp: 'ICP',
  vet: 'VeChain',
  egld: 'MultiversX',
  sui: 'Sui',
  apt: 'Aptos',
  sei: 'Sei',
  inj: 'Injective',
  kava: 'Kava',
  rune: 'THORChain',
};

/**
 * Human-readable name for a chain code. Curated overrides for the chains
 * users see most; everything else falls back to upper-case so codes like
 * `algo` read as `ALGO` rather than `Algo`. Returns `null` when given a
 * blank/missing code so callers can branch on "no network info".
 */
export function getNetworkLabel(network: string | null | undefined): string | null {
  if (!network) return null;
  const code = network.toLowerCase();
  return NETWORK_LABELS[code] ?? code.toUpperCase();
}
