'use client';

import { useEffect, useMemo, useState } from 'react';

import { CN_SITE_URL } from '@/lib/config';
import type {
  BtcCandle,
  PredictionEvent,
  RwaTicker,
} from '@/lib/api/featured-block';
import { FAMILY, PRODUCTS } from '@/lib/links';

/* ─────────────────────────────────────────────────────────────────────────
   Liquid-glass FeaturesBlock — five tabs (Featured / Trade / Earn / Spend /
   Send). The Featured + Trade tabs do most of the visual work:
     • Featured: prediction event + RWA tickers (live last-candle tick) +
       payment link + NOW Wallet.
     • Trade: four cards. A single BTC weekly chart spans the first three
       (Spot, Cross-chain swap, Perpetuals). The fourth (Prediction
       markets) gets its own composition. Spot carries a buy-point marker
       AND the current-price label; Perps ticks "+10 USDC" pings.
   ──────────────────────────────────────────────────────────────────────── */

type TabId = 'featured' | 'trade' | 'earn' | 'spend' | 'send';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'featured', label: 'Featured' },
  { id: 'trade', label: 'Trade' },
  { id: 'earn', label: 'Earn' },
  { id: 'spend', label: 'Spend' },
  { id: 'send', label: 'Send' },
];

interface SimpleCard {
  id: string;
  title: string;
  sub: string;
  href: string;
  external?: boolean;
  tone: 'graphite' | 'plum' | 'amber' | 'teal';
}

// ─── Auth-aware payment-link href ──────────────────────────────────────────
// Pro feature. When the user is anonymous we send them to /authorization
// pre-populated with a `next=` query so the post-auth redirect lands on the
// payment-link page — exactly the cross-surface flow the user asked for.
function paymentLinkHref(isAuthed: boolean): string {
  if (isAuthed) return `${CN_SITE_URL}/pro/payment-link`;
  return `/authorization?next=${encodeURIComponent('/pro/payment-link')}`;
}

// ─── BTC chart math ─────────────────────────────────────────────────────────
interface ChartPath {
  d: string;
  area: string;
  first: number;
  last: number;
  min: number;
  max: number;
  /** Each polyline point in viewBox coordinates. Used to drop overlay
   *  markers (buy point, current price) at the exact pixel of a candle. */
  points: Array<{ x: number; y: number; close: number }>;
}
function buildClosePath(
  candles: ReadonlyArray<BtcCandle>,
  width: number,
  height: number,
  padTop = 16,
  padBottom = 16,
): ChartPath | null {
  if (candles.length < 2) return null;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const xStep = width / (candles.length - 1);
  const yOf = (v: number) =>
    padTop + (height - padTop - padBottom) * (1 - (v - min) / span);
  const points = closes.map((c, i) => ({ x: i * xStep, y: yOf(c), close: c }));
  const d =
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  const area = `${d} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
  return {
    d,
    area,
    first: closes[0]!,
    last: closes[closes.length - 1]!,
    min,
    max,
    points,
  };
}

// ─── RWA mock candles ──────────────────────────────────────────────────────
// Deterministic LCG so the SSR and first-client paint agree pixel-for-pixel.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateStaticCandles(count: number, seed: number): BtcCandle[] {
  const rand = makeRng(seed);
  const candles: BtcCandle[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.48) * 8;
    const open = price;
    const close = Math.max(20, price + drift);
    const high = Math.max(open, close) + rand() * 3;
    const low = Math.min(open, close) - rand() * 3;
    candles.push({ time: i, open, high, low, close });
    price = close;
  }
  return candles;
}

interface CandleChartProps {
  candles: ReadonlyArray<BtcCandle>;
  width: number;
  height: number;
}
function MiniCandles({ candles, width, height }: CandleChartProps) {
  if (candles.length === 0) return null;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1;
  const gap = 4;
  const cw = (width - gap * (candles.length - 1)) / candles.length;
  const yOf = (v: number) => height - (height * (v - min)) / span;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {candles.map((c, i) => {
        const x = i * (cw + gap);
        const up = c.close >= c.open;
        const bodyTop = yOf(Math.max(c.open, c.close));
        const bodyBottom = yOf(Math.min(c.open, c.close));
        const wickTop = yOf(c.high);
        const wickBottom = yOf(c.low);
        const colour = up ? '#4ED9A0' : '#FF7A5C';
        return (
          <g key={i} opacity={0.85}>
            <line
              x1={x + cw / 2}
              x2={x + cw / 2}
              y1={wickTop}
              y2={wickBottom}
              stroke={colour}
              strokeWidth={1}
            />
            <rect
              x={x}
              y={Math.min(bodyTop, bodyBottom)}
              width={cw}
              height={Math.max(2, Math.abs(bodyBottom - bodyTop))}
              fill={colour}
              rx={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Featured cards data builders ──────────────────────────────────────────

interface PredictionDisplay {
  title: string;
  pct: number;
  endsIn: string;
  imageUrl: string | null;
}

function predictionFallback(): PredictionDisplay {
  // When the live endpoint is unreachable in dev (no VPN, transient 5xx),
  // we still want the card to read as a real market — not blank. The copy
  // is intentionally evergreen so it doesn't go stale next quarter.
  return {
    title: 'Will Bitcoin close above $100k by year-end?',
    pct: 64,
    endsIn: 'closes in 4d',
    imageUrl: null,
  };
}

/**
 * Single source for "what does the card show right now" — accepts the
 * server-fetched event (or null) and folds in the fallback when needed.
 * Both Featured and Trade prediction cards consume this same shape.
 */
function toPredictionDisplay(event: PredictionEvent | null): PredictionDisplay {
  if (!event) return predictionFallback();
  return {
    title: event.title,
    pct: event.primaryOutcome.pricePct,
    endsIn: formatEventEndsIn(event.endsAt),
    imageUrl: event.imageUrl,
  };
}

function formatEventEndsIn(endsAt: string): string {
  const ms = Date.parse(endsAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `closes in ${days}d`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `closes in ${hours}h`;
}

interface Props {
  event: PredictionEvent | null;
  rwa: ReadonlyArray<RwaTicker>;
  btcCandles: ReadonlyArray<BtcCandle>;
  isAuthed: boolean;
}

// ─── Featured tab ──────────────────────────────────────────────────────────

function FeaturedPredictionCard({ event }: { event: PredictionEvent | null }) {
  const display = toPredictionDisplay(event);
  return (
    <a href={`${CN_SITE_URL}/predictions`} className="fb-card fb-card--liquid tone-plum">
      <div className="fb-liquid-vis">
        <div className="fb-pred-stack">
          <div className="fb-pred-head">
            <div className="fb-pred-question">{display.title}</div>
            {/* Event thumbnail — square, top-right. Soft glow + 1px rim for
                the iridescent-glass feel. Plain `<img>` (not next/image)
                because the host is a third-party CDN and we don't want to
                push Next's image optimiser through it for a 56px badge. */}
            {display.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={display.imageUrl}
                alt=""
                aria-hidden
                className="fb-pred-image"
                loading="lazy"
                decoding="async"
                width={56}
                height={56}
              />
            )}
          </div>
          <div className="fb-pred-outcomes">
            <div className="fb-pred-outcome fb-pred-outcome--yes">
              <span>YES</span>
              <strong>{display.pct}¢</strong>
            </div>
            <div className="fb-pred-outcome">
              <span>NO</span>
              <strong>{100 - display.pct}¢</strong>
            </div>
          </div>
          {display.endsIn && <div className="fb-pred-meta">{display.endsIn}</div>}
        </div>
      </div>
      <div className="fb-caption">
        <h3 className="fb-caption-title">Prediction markets</h3>
        <p className="fb-caption-sub">Trade live odds on crypto, politics, sports.</p>
      </div>
    </a>
  );
}

/**
 * RWA card with a live-market candle feed.
 *
 * Two pieces of state:
 *   - `candles` — the static history (12 closed candles). Rendered on the
 *     server too, so the first paint has the chart already painted in.
 *   - `tickClose` — the close price of the *forming* (13th) candle, updated
 *     every 2.5 s. The candle's open/high/low stay fixed for the duration
 *     of its "session"; close drifts up or down inside the OHLC range. When
 *     `tickClose` crosses the high/low, those extend with it. This matches
 *     how a real exchange feed paints the current candle vs the closed
 *     history — only the rightmost wick wobbles.
 *
 * The 12 historical candles never re-render after mount. The 13th repaints
 * (only its body/wick) on each tick. Total cost per tick is one SVG group,
 * which the browser composites without layout.
 */
function FeaturedRwaCard({ rwa }: { rwa: ReadonlyArray<RwaTicker> }) {
  // Deterministic seed so SSR + hydration match. After mount we don't touch
  // the seed — only the live candle wobbles, the rest stays fixed.
  const HISTORY_COUNT = 12;
  const initialHistory = useMemo(() => generateStaticCandles(HISTORY_COUNT, 20251119), []);
  const [history] = useState<BtcCandle[]>(initialHistory);
  const [liveCandle, setLiveCandle] = useState<BtcCandle>(() => {
    const last = initialHistory[initialHistory.length - 1]!;
    const open = last.close;
    return { time: HISTORY_COUNT, open, high: open + 2, low: open - 2, close: open };
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveCandle((c) => {
        // Random walk on the close — small drift either way, mostly within
        // ±1.5% of open. Extend the high/low if we punch through them.
        const drift = (Math.random() - 0.48) * 4;
        const close = Math.max(20, c.close + drift);
        const high = Math.max(c.high, close);
        const low = Math.min(c.low, close);
        return { ...c, close, high, low };
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  // Combine history + live candle for the chart.
  const candles = useMemo(() => [...history, liveCandle], [history, liveCandle]);

  return (
    <a href={`${CN_SITE_URL}/real-world-assets`} className="fb-card fb-card--liquid tone-amber">
      <div className="fb-liquid-vis">
        {/* Candles live on the background layer (z-index 0). The ticker
            stack overlays them with backdrop-blur, so the live wobble is
            visible behind a soft frost. */}
        <div className="fb-rwa-chart" aria-hidden>
          <MiniCandles candles={candles} width={330} height={260} />
        </div>
        <div className="fb-rwa-list">
          {rwa.map((row) => (
            <div key={row.ticker} className="fb-rwa-row">
              <span className="fb-rwa-name">{row.label}</span>
              {/* Strip the chain suffix (`erc20`, `sol`, `trx`, …) — users
                  recognise the symbol by its short form (XAUT, NVDAON,
                  AAPLON). The catalog ticker still has the suffix because
                  one symbol can live on multiple chains. */}
              <span className="fb-rwa-ticker">
                {row.ticker.replace(/(erc20|sol|trx|bep20|bsc|matic|trc20)$/i, '').toUpperCase()}
              </span>
              <span
                className={`fb-rwa-change ${
                  row.change24hPct == null ? '' : row.change24hPct >= 0 ? 'up' : 'dn'
                }`}
              >
                {row.change24hPct == null
                  ? '—'
                  : `${row.change24hPct >= 0 ? '+' : ''}${row.change24hPct.toFixed(2)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="fb-caption">
        <h3 className="fb-caption-title">Tokenized stocks &amp; RWA</h3>
        <p className="fb-caption-sub">Hold Apple, NVIDIA, gold — settle in stables.</p>
      </div>
    </a>
  );
}

function FeaturedPaymentLinkCard({ isAuthed }: { isAuthed: boolean }) {
  return (
    <a href={paymentLinkHref(isAuthed)} className="fb-card fb-card--liquid tone-graphite">
      <div className="fb-liquid-vis">
        <div className="fb-pay-receipt">
          <div className="fb-pay-row">
            <span className="fb-pay-dot" aria-hidden />
            <span>Payment received</span>
          </div>
          <div className="fb-pay-amount">+320.00 <em>USDT</em></div>
          <div className="fb-pay-meta">from inv-4f2a · 2 sec ago</div>
        </div>
      </div>
      <div className="fb-caption">
        <h3 className="fb-caption-title">Payment links</h3>
        <p className="fb-caption-sub">Share a link, receive any crypto on any chain.</p>
      </div>
    </a>
  );
}

function FeaturedNowWalletCard() {
  return (
    <a
      href={FAMILY.nowWallet}
      target="_blank"
      rel="noopener noreferrer"
      className="fb-card fb-card--liquid tone-teal"
    >
      <div className="fb-liquid-vis">
        <div className="fb-wallet-card" aria-hidden>
          <div className="fb-wallet-glow" />
          {/* Real NOW Wallet wordmark (icon + "NOW Wallet" lettering in
              the brand-green ramp). Pulled from
              `/public/images/products/wordmarks/now-wallet.svg`, the
              same asset the marketing wordmark slot on /now-wallet
              uses. 127×42 native — rendered here at 28px tall, width
              proportional. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="fb-wallet-logo"
            src="/images/products/wordmarks/now-wallet.svg"
            alt=""
            width={84}
            height={28}
          />
          <div className="fb-wallet-balance">$24,180.42</div>
          <div className="fb-wallet-chain-row">
            <span className="fb-wallet-chain">BTC</span>
            <span className="fb-wallet-chain">ETH</span>
            <span className="fb-wallet-chain">SOL</span>
            <span className="fb-wallet-chain fb-wallet-chain--more">+12</span>
          </div>
        </div>
      </div>
      <div className="fb-caption">
        <h3 className="fb-caption-title">NOW Wallet</h3>
        <p className="fb-caption-sub">Non-custodial Web3 wallet — keys in your hand.</p>
      </div>
    </a>
  );
}

// ─── Trade tab — 4 cards, BTC chart spans the first 3 ───────────────────────

/**
 * Perpetuals card with ticking "+10 USDC" pings. Each notification appears
 * at the top of the card, stacks for a beat, then expires. Random jitter on
 * the amount keeps them from reading as identical copies — the user asked
 * for `+10 USDC` so we vary by ±0.6 USDC inside the rendered string.
 *
 * The notifications are SSR-skipped (rendered only after `mounted`) so the
 * server HTML is empty and hydration sees zero pings on first paint —
 * matches. Then they start ticking in client-only on a 2.8 s cadence.
 */
function PerpsNotificationStack() {
  interface Ping { id: number; amount: number }
  const [pings, setPings] = useState<Ping[]>([]);
  useEffect(() => {
    let n = 0;
    const tick = () => {
      n += 1;
      const amount = 10 + (Math.random() - 0.5) * 1.2;
      setPings((cur) => [...cur, { id: n, amount }].slice(-3));
      // Expire the oldest after the slide-out finishes so it doesn't
      // accumulate forever — slice(-3) above is a safety cap.
      window.setTimeout(() => {
        setPings((cur) => cur.filter((p) => p.id !== n));
      }, 4_500);
    };
    // First ping after a short delay so the card has time to mount.
    const initial = window.setTimeout(tick, 900);
    const interval = window.setInterval(tick, 2_800);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);
  return (
    <div className="fb-perp-pings" aria-hidden>
      {pings.map((p) => (
        <div key={p.id} className="fb-perp-ping">
          <span className="fb-perp-ping-dot" />
          <span className="fb-perp-ping-amount">+{p.amount.toFixed(2)}</span>
          <span className="fb-perp-ping-unit">USDC</span>
          <span className="fb-perp-ping-label">funding</span>
        </div>
      ))}
    </div>
  );
}

// One-third of the chart width — each Trade card (Spot / Cross-chain /
// Perps) renders its own SVG slice keyed to one of these viewBox bands.
// The slices line up edge-to-edge so the curve LOOKS continuous within
// each card, but the 16px gaps between cards break the line — the chart
// is clipped at card boundaries, restoring per-card differentiation.
const CHART_W = 1200;
const CHART_H = 320;
const CARD_VBW = CHART_W / 3;

/**
 * Renders one third of the BTC chart inside a card. The viewBox is
 * windowed onto the requested slice (0, 1, or 2) while the path data
 * stays in full-chart coordinates — `preserveAspectRatio="none"`
 * stretches the slice to fill the card, and the default SVG
 * `overflow: hidden` clips the rest. Gradients use
 * `gradientUnits="userSpaceOnUse"` so the stroke + fill colours stay
 * continuous across slice boundaries (slice 0 sees the green end,
 * slice 2 sees the blue end). The optional marker is an SVG dot drawn
 * at the same coordinates the HTML pill references.
 */
function CardChartSlice({
  path,
  slice,
  marker,
  dotColor,
  gradientId,
}: {
  path: ChartPath;
  slice: 0 | 1 | 2;
  marker?: { x: number; y: number } | null;
  dotColor?: string;
  gradientId: string;
}) {
  const x0 = CARD_VBW * slice;
  return (
    <div className="fb-trade-cardchart" aria-hidden>
      <svg
        viewBox={`${x0} 0 ${CARD_VBW} ${CHART_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={`fb-chart-stroke-${gradientId}`}
            x1={0}
            y1={0}
            x2={CHART_W}
            y2={0}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1FB877" />
            <stop offset="50%" stopColor="#2495C8" />
            <stop offset="100%" stopColor="#2F73D6" />
          </linearGradient>
          <linearGradient
            id={`fb-chart-fill-${gradientId}`}
            x1={0}
            y1={0}
            x2={0}
            y2={CHART_H}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#22B477" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2F73D6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={path.area} fill={`url(#fb-chart-fill-${gradientId})`} />
        <path
          d={path.d}
          fill="none"
          stroke={`url(#fb-chart-stroke-${gradientId})`}
          strokeWidth={3.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {marker && dotColor && (
          <g>
            <circle cx={marker.x} cy={marker.y} r={9} fill={dotColor} fillOpacity={0.18} />
            <circle cx={marker.x} cy={marker.y} r={4} fill={dotColor} />
            <circle cx={marker.x} cy={marker.y} r={4} fill="none" stroke="#fff" strokeWidth={1.6} />
          </g>
        )}
      </svg>
    </div>
  );
}

function TradeTab({
  candles,
  isAuthed,
  event,
}: {
  candles: ReadonlyArray<BtcCandle>;
  isAuthed: boolean;
  event: PredictionEvent | null;
}) {
  const predDisplay = toPredictionDisplay(event);
  const path = useMemo(
    () => buildClosePath(candles, CHART_W, CHART_H, 40, 40),
    [candles],
  );

  const spotHref = isAuthed
    ? `${CN_SITE_URL}/pro/balance`
    : `/authorization?next=${encodeURIComponent('/pro/balance')}`;

  // Buy point lives inside slice 0 (Spot card): roughly 1/6 through the
  // full dataset, comfortably inside the first third of viewBox space.
  const buyIdx = path ? Math.max(2, Math.floor(path.points.length * 0.16)) : 0;
  // Swap point lives inside slice 1 (Cross-chain card): mid-dataset,
  // centred in the middle third of viewBox space.
  const swapIdx = path ? Math.floor(path.points.length * 0.5) : 0;
  const buy = path?.points[buyIdx] ?? null;
  const swap = path?.points[swapIdx] ?? null;
  const last = path?.points[path.points.length - 1] ?? null;

  // P&L change from buy point to latest close.
  const changePct =
    buy && last && buy.close > 0
      ? ((last.close - buy.close) / buy.close) * 100
      : null;
  const changeUp = changePct != null && changePct >= 0;

  // BTC → USDT placeholder rate: 1 BTC ≈ the latest close in USDT, rounded
  // to thousands so the chip stays compact.
  const swapBtcAmount = 0.5;
  const swapUsdtAmount = swap ? swap.close * swapBtcAmount : null;

  const formatBtc = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatUsdt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <div className="fb-trade-row">
      {/* 1. Spot & limit — slice 0 of the chart with the buy point. The
            marker pill is anchored to the top-left so it never overlaps
            the title at the bottom of the card; the SVG dot still marks
            the exact chart position. */}
      <a href={spotHref} className="fb-trade-card tone-spot">
        {path && (
          <CardChartSlice
            path={path}
            slice={0}
            marker={buy}
            dotColor="#00C26F"
            gradientId="spot"
          />
        )}
        <div className="fb-trade-overlay">
          {buy && changePct != null && (
            <div className="fb-trade-marker fb-trade-marker--corner">
              <span className="fb-trade-marker-dot fb-trade-marker-dot--buy" aria-hidden />
              <div className="fb-trade-marker-body">
                <div className="fb-trade-marker-label">
                  Bought ${formatBtc(buy.close)}
                </div>
                <div
                  className={`fb-trade-marker-change ${changeUp ? 'up' : 'dn'}`}
                >
                  {changeUp ? '+' : ''}
                  {changePct.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
          {/* No separate current-price chip here — the buy pill already
              carries the entry price + signed % change vs the latest
              close, so the two would compete for the same top-row real
              estate and overlap on narrow columns (per user feedback). */}
        </div>
        <div className="fb-trade-caption">
          <h3 className="fb-trade-title">Spot &amp; limit</h3>
          <p className="fb-trade-sub">Pro tools, deepest liquidity.</p>
        </div>
      </a>

      {/* 2. Cross-chain swap — slice 1 with the swap point. Pill at top-left
            shows "BTC → USDT" with the implied rate; the teal dot on the
            chart points at the chart candle the rate is taken from. The
            `?mode=bridge` query opens /exchange directly on the Bridge
            tab so the user lands inside the cross-chain UX from one
            click — no extra tab switch. */}
      <a
        href={`${PRODUCTS.exchange}?mode=bridge`}
        className="fb-trade-card tone-swap"
      >
        {path && (
          <CardChartSlice
            path={path}
            slice={1}
            marker={swap}
            dotColor="#2495C8"
            gradientId="swap"
          />
        )}
        <div className="fb-trade-overlay">
          {swap && swapUsdtAmount != null && (
            <div className="fb-trade-marker fb-trade-marker--corner">
              <span className="fb-trade-marker-dot fb-trade-marker-dot--swap" aria-hidden />
              <div className="fb-trade-marker-body">
                <div className="fb-trade-marker-label">
                  {swapBtcAmount} BTC → {formatUsdt(swapUsdtAmount)} USDT
                </div>
                <div className="fb-trade-marker-meta">Cross-chain · ~4 min</div>
              </div>
            </div>
          )}
        </div>
        <div className="fb-trade-caption">
          <h3 className="fb-trade-title">Cross-chain swap</h3>
          <p className="fb-trade-sub">70+ networks in one trade.</p>
        </div>
      </a>

      {/* 3. Perpetuals — slice 2, ticking +10 USDC notifications. No
            chart marker; the pings carry the action. */}
      <a href={PRODUCTS.perpetuals} className="fb-trade-card tone-perps">
        {path && <CardChartSlice path={path} slice={2} gradientId="perps" />}
        <div className="fb-trade-overlay">
          <PerpsNotificationStack />
        </div>
        <div className="fb-trade-caption">
          <h3 className="fb-trade-title">Perpetuals</h3>
          <p className="fb-trade-sub">
            Up to 100× leverage. <span className="fb-soon-chip">Soon</span>
          </p>
        </div>
      </a>

      {/* 4. Prediction markets — outside the chart band. Same real-event
            data as the Featured prediction card, so the question + odds +
            thumbnail stay in lock-step across surfaces. */}
      <a href={PRODUCTS.predictions} className="fb-trade-card fb-trade-card--solo tone-plum">
        <div className="fb-trade-overlay fb-trade-pred-overlay">
          <div className="fb-trade-pred-head">
            <div className="fb-trade-pred-question">{predDisplay.title}</div>
            {predDisplay.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={predDisplay.imageUrl}
                alt=""
                aria-hidden
                className="fb-trade-pred-image"
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
              />
            )}
          </div>
          <div className="fb-trade-pred-row">
            <span className="fb-trade-pred-chip fb-trade-pred-chip--yes">
              YES · {predDisplay.pct}¢
            </span>
            <span className="fb-trade-pred-chip">NO · {100 - predDisplay.pct}¢</span>
          </div>
        </div>
        <div className="fb-trade-caption">
          <h3 className="fb-trade-title">Prediction markets</h3>
          <p className="fb-trade-sub">Bet on outcomes — politics, crypto, sports.</p>
        </div>
      </a>
    </div>
  );
}

// ─── Earn / Spend / Send — flat list of real cards ─────────────────────────

const EARN_CARDS: SimpleCard[] = [
  { id: 'stake', title: 'NOW staking', sub: 'Up to 12% APR, unstake anytime.', href: PRODUCTS.staking, tone: 'teal' },
  { id: 'rwa', title: 'Tokenized stocks', sub: 'Apple, NVIDIA, gold.', href: PRODUCTS.rwa, tone: 'amber' },
  { id: 'now', title: 'NOW token', sub: 'Lower fees, partner perks.', href: FAMILY.nowToken, tone: 'plum' },
  { id: 'loans', title: 'Crypto-backed loans', sub: 'Borrow stables against BTC, ETH.', href: PRODUCTS.loans, tone: 'graphite' },
];

const SPEND_CARDS: SimpleCard[] = [
  { id: 'pay', title: 'Pay invoices', sub: 'Bills, rent, subscriptions.', href: PRODUCTS.payInvoice, tone: 'teal' },
  { id: 'travel', title: 'Book travel', sub: 'Flights & hotels with crypto.', href: PRODUCTS.travel, tone: 'plum' },
];

const SEND_CARDS: SimpleCard[] = [
  { id: 'private', title: 'Private send', sub: 'No metadata, no trace.', href: PRODUCTS.privateSwap, tone: 'plum' },
  { id: 'bridge', title: 'Multichain bridge', sub: 'Move assets across networks.', href: PRODUCTS.bridge, tone: 'teal' },
];

function SimpleGrid({ cards, isAuthed }: { cards: ReadonlyArray<SimpleCard>; isAuthed: boolean }) {
  return (
    <div className="fb-grid">
      {cards.map((c) => {
        const href = c.id === 'paid' ? paymentLinkHref(isAuthed) : c.href;
        return (
          <a
            key={c.id}
            href={href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener noreferrer' : undefined}
            className={`fb-card tone-${c.tone}`}
          >
            <div className="fb-vis">
              <div className="fb-vis-bg" />
            </div>
            <div className="fb-caption">
              <h3 className="fb-caption-title">{c.title}</h3>
              <p className="fb-caption-sub">{c.sub}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function FeaturesBlockClient({ event, rwa, btcCandles, isAuthed }: Props) {
  const [tab, setTab] = useState<TabId>('featured');
  return (
    <section className="fb-section">
      <div className="fb-head">
        <h2>One app. All your crypto. Every verb.</h2>
        <p className="fb-sub">
          Money is a verb here. Trade, hold, stake, borrow, invest, spend — without ever leaving
          the app.
        </p>
      </div>
      <div className="fb-tabs" role="tablist">
        <div className="fb-tab-group">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`fb-tab ${tab === t.id ? 'on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        {tab === 'featured' && (
          <div className="fb-grid">
            <FeaturedPredictionCard event={event} />
            <FeaturedRwaCard rwa={rwa} />
            <FeaturedPaymentLinkCard isAuthed={isAuthed} />
            <FeaturedNowWalletCard />
          </div>
        )}
        {tab === 'trade' && (
          <TradeTab candles={btcCandles} isAuthed={isAuthed} event={event} />
        )}
        {tab === 'earn' && <SimpleGrid cards={EARN_CARDS} isAuthed={isAuthed} />}
        {tab === 'spend' && <SimpleGrid cards={SPEND_CARDS} isAuthed={isAuthed} />}
        {tab === 'send' && <SimpleGrid cards={SEND_CARDS} isAuthed={isAuthed} />}
      </div>
    </section>
  );
}
