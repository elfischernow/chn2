import { getSparkline, getTopCurrencies, type SparklinePoint } from '@/lib/api/cryptorank';
import { getCurrencies } from '@/lib/api/currencies';
import { buildExchangeUrl } from '@/lib/api/exchange';
import { LEARN } from '@/lib/links';

import { Coin } from './Coin';

const FEATURED_COUNT = 8;

// Tickers we never feature on the rates board. Stables sit at the bottom of
// the % column (no movement to look at) and the wrapped-BTC pile duplicates
// the BTC row visually. Keeping the filter explicit so it can be tuned per
// product feedback rather than buried in a regex.
const SKIP_TICKERS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'WBTC', 'STETH', 'WSTETH', 'WETH']);

interface BoardRow {
  symbol: string;
  name: string;
  price: number;
  iconUrl: string | null;
  /** 24h % change derived from sparkline endpoints (start vs end). */
  changePct: number | null;
  spark: SparklinePoint[] | null;
}

async function loadBoard(): Promise<BoardRow[]> {
  // Pull cryptorank's ranked list and our content-api catalog in parallel.
  // Cryptorank → ranking + price + sparkline; content-api → official coin
  // icons (the SVGs that match the rest of the product surface). We never
  // fall through to cryptorank's image CDN — keeps a single visual style.
  const [top, currencies] = await Promise.all([
    getTopCurrencies(FEATURED_COUNT * 3),
    getCurrencies(),
  ]);

  // Build a ticker→iconUrl lookup. The catalog has multiple rows per
  // ticker (USDT on TRC20/ERC20/…); icons are identical across networks
  // so first-write-wins works fine here.
  const iconBySymbol = new Map<string, string>();
  for (const c of currencies) {
    const t = c.currentTicker.toUpperCase();
    if (!iconBySymbol.has(t) && c.iconUrl) iconBySymbol.set(t, c.iconUrl);
  }

  const filtered = top
    .filter((c) => !SKIP_TICKERS.has(c.symbol))
    .slice(0, FEATURED_COUNT);

  // Spark + 24h delta come from the same endpoint — fetch once per coin.
  const sparks = await Promise.all(
    filtered.map((c) => getSparkline(c.id, '1D').catch(() => null)),
  );

  return filtered.map((c, i) => {
    const points = sparks[i];
    let changePct: number | null = null;
    if (points && points.length > 1) {
      const first = points[0]!.price;
      const last = points[points.length - 1]!.price;
      if (first > 0) changePct = ((last - first) / first) * 100;
    }
    return {
      symbol: c.symbol,
      name: c.name,
      price: c.price,
      iconUrl: iconBySymbol.get(c.symbol) ?? null,
      changePct,
      spark: points,
    };
  });
}

function formatUsd(n: number): string {
  if (n >= 1000)
    return n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}

function Sparkline({ points, up }: { points: SparklinePoint[]; up: boolean }) {
  // Tiny inline SVG path. Fixed viewBox so the curve scales with the cell;
  // the rendered width is set by CSS. Single-color stroke + soft area fill
  // — enough to read the trend without looking like a real chart.
  const W = 120;
  const H = 36;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const coords = prices.map((p, i) => {
    const x = i * step;
    const y = H - ((p - min) / span) * (H - 4) - 2;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const color = up ? '#4ED9A0' : '#FF7A5C';
  const fillId = `sparkfill-${up ? 'u' : 'd'}`;
  return (
    <svg className="rates-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export async function RatesLiquidity() {
  const rows = await loadBoard();
  // Aggregate stats from the board itself — sum of (volume24h) for the
  // featured set isn't market-wide, so the cards stay scoped to what we
  // actually know: number of featured assets, currencies in catalog,
  // chains supported. No fake "$2.4B 30d volume" from the previous version.
  return (
    <section className="rates-section">
      <div className="rates-head">
        <div>
          <div className="rates-pulse">
            <span className="rates-pulse-dot" />
            <span>Live · 24h prices · refreshed every minute</span>
          </div>
          <h2>Real prices.<br />Real charts.</h2>
          <p className="rates-sub">
            Top assets by market cap with 24-hour movement, charted from CryptoRank&apos;s
            live feed. Tap any row to swap into it — no signup, fixed or floating rate.
          </p>
        </div>
        <div className="rates-stats">
          <div><strong>1,261</strong><span>currencies</span></div>
          <div><strong>110+</strong><span>chains</span></div>
          <div><strong>100+</strong><span>liquidity sources</span></div>
        </div>
      </div>
      <div className="rates-board">
        <div className="rates-board-row head">
          <span>Asset</span>
          <span>Price</span>
          <span>24h</span>
          <span>Last 24 hours</span>
          <span></span>
        </div>
        {rows.length === 0 && (
          <div className="rates-board-empty">
            Live prices unavailable right now — try refreshing in a moment.
          </div>
        )}
        {rows.map((r) => {
          const up = (r.changePct ?? 0) >= 0;
          return (
            <a
              className="rates-board-row"
              href={buildExchangeUrl({ from: 'USDT', to: r.symbol, amount: '100' })}
              key={r.symbol}
            >
              <span className="rates-asset">
                <Coin symbol={r.symbol} iconUrl={r.iconUrl} size={36} />
                <span className="rates-asset-text">
                  <span className="rates-asset-ticker">{r.symbol}</span>
                  <span className="rates-asset-name">{r.name}</span>
                </span>
              </span>
              <span className="rates-price">${formatUsd(r.price)}</span>
              <span className={`rates-delta ${r.changePct == null ? '' : up ? 'up' : 'dn'}`}>
                {r.changePct == null ? '—' : `${up ? '+' : ''}${r.changePct.toFixed(2)}%`}
              </span>
              <span className="rates-spark-cell">
                {r.spark && r.spark.length > 1 ? <Sparkline points={r.spark} up={up} /> : null}
              </span>
              <span className="rates-cta">Trade →</span>
            </a>
          );
        })}
      </div>
      <a className="rates-all" href={LEARN.allCurrencies}>View all 1,261 currencies →</a>
    </section>
  );
}
