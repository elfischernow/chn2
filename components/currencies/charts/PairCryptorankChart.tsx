'use client';

import { useEffect, useMemo, useState } from 'react';
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
  fromCryptorankId: number;
  toCryptorankId: number;
  fromName: string;
  toName: string;
  toTicker: string;
  fromIconUrl: string | null;
  /** Pre-rendered FROM sparkline at the default 1Y range (SSR'd). */
  initialFrom?: SparklinePoint[] | null;
  initialTo?: SparklinePoint[] | null;
}

/**
 * Live area chart for an X→Y exchange rate. Computes the pair price as
 * `from.priceUSD / to.priceUSD` per timestamp, dropping any timestamps
 * that don't appear on both sides. Mirrors the legacy
 * `crypto-pair-chart` algorithm.
 */
export function PairCryptorankChart({
  fromCryptorankId,
  toCryptorankId,
  fromName,
  toName,
  toTicker,
  fromIconUrl,
  initialFrom,
  initialTo,
}: Props) {
  const [range, setRange] = useState<SparklineRange>('1Y');
  const [fromData, setFromData] = useState<SparklinePoint[]>(initialFrom ?? []);
  const [toData, setToData] = useState<SparklinePoint[]>(initialTo ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // SSR'd 1Y window — no need to re-fetch on first mount.
    if (
      range === '1Y' &&
      initialFrom &&
      initialFrom.length > 0 &&
      initialTo &&
      initialTo.length > 0 &&
      fromData === initialFrom &&
      toData === initialTo
    ) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/cryptorank/sparkline?id=${fromCryptorankId}&range=${range}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/cryptorank/sparkline?id=${toCryptorankId}&range=${range}`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([f, t]: Array<{ values: SparklinePoint[] | null } | null>) => {
        if (cancelled) return;
        const fv = f?.values ?? null;
        const tv = t?.values ?? null;
        if (!fv?.length || !tv?.length) {
          setError(true);
          setFromData([]);
          setToData([]);
        } else {
          setFromData(fv);
          setToData(tv);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCryptorankId, toCryptorankId, range, initialFrom, initialTo, fromData, toData]);

  const data = useMemo(() => computeRatio(fromData, toData), [fromData, toData]);
  const last = data.length > 0 ? data[data.length - 1] : null;
  const ticks = pickUniqueTicks(data, range);

  return (
    <div className={styles.chart}>
      <header className={styles.header}>
        {fromIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.icon} src={fromIconUrl} alt="" decoding="async" />
        )}
        <div>
          <h3 className={styles.title}>
            {fromName} / {toName}
          </h3>
          {last && (
            <span className={styles.price}>
              {formatTooltipPrice(last.price, '')} <small>{toTicker.toUpperCase()}</small>
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
                tickFormatter={(v) => formatYAxisTick(v as number, false)}
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
                        {formatTooltipPrice(p.price, '')} {toTicker.toUpperCase()}
                      </strong>
                    </div>
                  );
                }}
                cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }}
              />
              <defs>
                <linearGradient id="cryptorankPairAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#55d721" stopOpacity={0.55} />
                  <stop offset="90%" stopColor="#55d721" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="linear"
                dataKey="price"
                stroke="#069d19"
                strokeWidth={2}
                fill="url(#cryptorankPairAreaFill)"
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

/** Inner-join the two sparklines on timestamp and divide for the rate. */
function computeRatio(
  from: SparklinePoint[],
  to: SparklinePoint[],
): SparklinePoint[] {
  if (!from.length || !to.length) return [];
  const toMap = new Map<number, number>();
  for (const p of to) toMap.set(p.timestamp, p.price);
  const out: SparklinePoint[] = [];
  for (const p of from) {
    const tv = toMap.get(p.timestamp);
    if (!tv || tv === 0) continue;
    out.push({ timestamp: p.timestamp, price: p.price / tv });
  }
  return out;
}
