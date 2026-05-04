'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  SPARKLINE_RANGES,
  type SparklinePoint,
  type SparklineRange,
} from '@/lib/api/cryptorank/types';

import {
  formatLongDate,
  formatTooltipPrice,
  formatXAxisTick,
  formatYAxisTick,
  pickUniqueTicks,
} from './chart-helpers';
import styles from './charts.module.css';

interface Props {
  /** Cryptorank coin ID. Resolved server-side from `coin.link`. */
  cryptorankId: number;
  /** Display name for the chart header. */
  coinName: string;
  /** Coin icon URL — same one used in the hero. */
  coinIconUrl: string | null;
  /**
   * Pre-rendered sparkline for the default 1Y range. Avoids a flash of
   * loading state on first paint — the SSR render already has data.
   * `null` when the upstream returned nothing for the default window;
   * the component will retry on the client.
   */
  initial?: SparklinePoint[] | null;
}

/**
 * Live area chart for a single coin's USD price. Re-fetches sparkline
 * data through `/api/cryptorank/sparkline` whenever the user picks a new
 * timeframe. Mirrors the legacy `CryptoChart` component's UX (header
 * with last-price, range buttons, area chart with green fill, footer
 * with last-data-point timestamp).
 */
export function CryptorankChart({ cryptorankId, coinName, coinIconUrl, initial }: Props) {
  const [range, setRange] = useState<SparklineRange>('1Y');
  const [data, setData] = useState<SparklinePoint[]>(initial ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Skip the very first 1Y fetch when SSR already gave us data — the
    // initial paint is correct and another network round-trip would
    // just waste budget. Subsequent range changes always fetch.
    if (range === '1Y' && initial && initial.length > 0 && data === initial) return;

    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/cryptorank/sparkline?id=${cryptorankId}&range=${range}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http ${r.status}`))))
      .then((j: { values: SparklinePoint[] | null }) => {
        if (cancelled) return;
        if (!j.values || j.values.length === 0) {
          setError(true);
          setData([]);
        } else {
          setData(j.values);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cryptorankId, range, initial, data]);

  const last = data.length > 0 ? data[data.length - 1] : null;
  const ticks = pickUniqueTicks(data, range);

  return (
    <div className={styles.chart}>
      <header className={styles.header}>
        {coinIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.icon} src={coinIconUrl} alt="" decoding="async" />
        )}
        <div>
          <h3 className={styles.title}>{coinName} / U.S. Dollar</h3>
          {last && (
            <span className={styles.price}>
              {formatTooltipPrice(last.price)} <small>USD</small>
            </span>
          )}
        </div>
      </header>

      <div className={styles.controls}>
        {SPARKLINE_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            data-active={r === range || undefined}
            className={styles.rangeBtn}
          >
            {r}
          </button>
        ))}
      </div>

      <div className={styles.canvas}>
        {loading && <div className={styles.loader} aria-hidden />}
        {error && !loading && <div className={styles.error}>Chart data unavailable</div>}
        {!error && data.length > 0 && (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => formatXAxisTick(ts as number, range)}
                ticks={ticks}
                stroke="var(--ink-3)"
                tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--ink-3)' }}
                axisLine={{ stroke: 'var(--line)' }}
                padding={{ left: 0, right: 0 }}
                textAnchor="end"
              />
              <YAxis
                dataKey="price"
                domain={['auto', 'auto']}
                tickFormatter={(v) => formatYAxisTick(v as number)}
                orientation="right"
                stroke="var(--ink-3)"
                tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--ink-3)' }}
                axisLine={{ stroke: 'var(--line)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]!.payload as SparklinePoint;
                  return (
                    <div className={styles.tooltip}>
                      <div className={styles.tooltipDate}>{formatLongDate(p.timestamp)}</div>
                      <strong className={styles.tooltipPrice}>
                        {formatTooltipPrice(p.price)}
                      </strong>
                    </div>
                  );
                }}
                cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }}
              />
              <defs>
                <linearGradient id="cryptorankAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#55d721" stopOpacity={0.55} />
                  <stop offset="90%" stopColor="#55d721" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="linear"
                dataKey="price"
                stroke="#069d19"
                strokeWidth={2}
                fill="url(#cryptorankAreaFill)"
                activeDot={{ r: 4, fill: '#069d19' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {last && !loading && (
        <footer className={styles.footer}>
          Data presented as of {formatLongDate(last.timestamp)}
        </footer>
      )}
    </div>
  );
}
