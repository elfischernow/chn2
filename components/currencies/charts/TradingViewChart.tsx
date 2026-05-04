'use client';

import { useEffect, useId, useRef } from 'react';

import styles from './charts.module.css';

interface Props {
  /**
   * TradingView symbol — usually `<EXCHANGE>:<BASE><QUOTE>` (e.g.
   * `BINANCE:BTCUSDT`). For coin pages we default to `*USDT` against
   * Binance / Kraken; for pairs the caller composes the symbol from
   * both tickers.
   */
  symbol: string;
  /** Aria label for the canvas slot — also used as the iframe title. */
  label: string;
}

/**
 * TradingView fallback. Loaded when we don't have a Cryptorank ID for
 * the coin / pair, or when the Cryptorank upstream isn't configured.
 * Mounts the official TV `MediumWidget` from `s3.tradingview.com/tv.js`.
 *
 * The widget renders its own header (coin pair name, current price,
 * % change) and footer (TV logo) — we deliberately don't add another
 * one above it. The wrapping `<section>` already carries the block's
 * h2 ("X Live Price Chart" / "X Market Data"), so an extra h3 here
 * stacks three titles on top of each other in the fallback path. The
 * Cryptorank chart, by contrast, draws no internal header so it gets
 * one from `CryptorankChart` itself.
 *
 * The `<script>` is appended on every mount; the browser de-dupes the
 * actual asset fetch via HTTP cache, and we keep it on the page so
 * other widgets mounted later (e.g. multiple charts on a single coin
 * page) reuse it.
 */
export function TradingViewChart({ symbol, label }: Props) {
  const containerId = `tv-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !slotRef.current) return;
    let cancelled = false;
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.body.getAttribute('data-theme') === 'dark';

    const render = () => {
      if (cancelled || !slotRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TV = (window as any).TradingView;
      if (!TV?.MediumWidget) return;
      // Empty the slot so a hot reload doesn't stack widgets on top.
      slotRef.current.innerHTML = `<div id="${containerId}"></div>`;
      // eslint-disable-next-line no-new
      new TV.MediumWidget({
        container_id: containerId,
        symbols: [[`${symbol}|1Y`]],
        chartOnly: false,
        width: '100%',
        height: 360,
        locale: 'en',
        colorTheme: isDark ? 'dark' : 'light',
        gridLineColor: 'rgba(120,120,140,0.12)',
        fontColor: '#83888D',
        underLineColor: 'rgba(85, 215, 33, 0.42)',
        trendLineColor: 'rgba(6, 157, 25, 1)',
        isTransparent: true,
        showChart: true,
        scalePosition: 'right',
        scaleMode: 'Normal',
        fontFamily: 'inherit',
        valuesTracking: '1',
        changeMode: 'price-and-percent',
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).TradingView?.MediumWidget) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [symbol, containerId]);

  return (
    <div className={styles.chart}>
      <div className={styles.canvas} ref={slotRef} aria-label={`${label} chart`} />
    </div>
  );
}
