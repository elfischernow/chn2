export const COIN_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  USDT: '#26A17B',
  USDC: '#2775CA',
  SOL: '#14F195',
  BNB: '#F0B90B',
  XRP: '#23292F',
  ADA: '#0033AD',
  TRX: '#FF060A',
  DOGE: '#C2A633',
  TON: '#0098EA',
};

interface CoinProps {
  symbol: string;
  size?: number;
  /**
   * Optional URL to an icon image (typically the upstream Strapi-served SVG).
   * When present, the image is rendered on top of the colored fallback so a
   * load failure or slow network still leaves a recognizable letter+color
   * tile underneath.
   */
  iconUrl?: string | null;
}

export function Coin({ symbol, size = 28, iconUrl = null }: CoinProps) {
  const upper = symbol.toUpperCase();

  if (iconUrl) {
    // Currency icons are pre-sized SVGs from `content-api.changenow.io` —
    // already shaped (round/square, with their own padding). Don't clip
    // them with a parent circle and don't tint the background; the icon
    // carries the brand color itself.
    //
    // Next/image is skipped on purpose: SVGs aren't re-encoded by the
    // optimizer, and routing through the image proxy adds latency to the
    // picker dropdown which is an LCP-irrelevant interaction surface.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        className="coin coin-img"
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    );
  }

  // Fallback when the upstream omitted an icon — render a colored letter
  // tile so the row is still visually distinct.
  return (
    <span
      className="coin coin-fallback"
      style={{ width: size, height: size, background: COIN_COLORS[upper] ?? '#999' }}
    >
      {upper.slice(0, 1)}
    </span>
  );
}
