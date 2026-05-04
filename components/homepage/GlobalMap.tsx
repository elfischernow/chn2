'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Coordinates within the dotted-worldmap.svg viewBox (961 × 487). Lifted
 * from the legacy `client/components/exchange-map/earth-points.js` — the
 * subset that sits on the populated landmasses where ChangeNOW sees real
 * traffic. Decorative only; positions are picked from this list at random.
 */
const EARTH_POINTS: ReadonlyArray<readonly [number, number]> = [
  // Europe
  [475, 95], [490, 100], [510, 105], [495, 115], [515, 130], [485, 140],
  [465, 110], [500, 95], [525, 120], [475, 145], [505, 145], [540, 135],
  // North America
  [195, 130], [220, 140], [180, 155], [240, 145], [165, 175], [200, 175],
  [230, 165], [255, 155], [185, 195], [215, 200], [250, 185], [275, 170],
  // Asia
  [720, 165], [700, 155], [685, 175], [745, 180], [765, 200], [780, 175],
  [820, 195], [850, 215], [810, 230], [770, 245], [730, 215], [690, 195],
  // South America
  [285, 305], [305, 320], [320, 290], [295, 345], [315, 360], [275, 280],
  // Africa & ME
  [510, 195], [530, 215], [555, 225], [540, 250], [570, 270], [580, 195],
  // Oceania
  [820, 360], [840, 350], [855, 375], [800, 345],
];

interface Tx {
  from: string;
  to: string;
  send: number;
  receive: number;
}

/**
 * Modernized subset of the legacy `txs-data.js` — stuck to actually-listed
 * tickers in 2024+ so the rolling labels read as plausible exchanges
 * rather than 2018 nostalgia (xvg / nbt / nlg etc. dropped).
 */
const TXS_DATA: readonly Tx[] = [
  { from: 'btc', to: 'eth', send: 0.5, receive: 12.78 },
  { from: 'eth', to: 'btc', send: 4, receive: 0.156 },
  { from: 'btc', to: 'usdt', send: 0.1, receive: 7613.4 },
  { from: 'usdt', to: 'btc', send: 5000, receive: 0.0656 },
  { from: 'eth', to: 'usdc', send: 2, receive: 6390 },
  { from: 'sol', to: 'btc', send: 25, receive: 0.0712 },
  { from: 'btc', to: 'sol', send: 0.05, receive: 17.55 },
  { from: 'usdt', to: 'eth', send: 1500, receive: 0.469 },
  { from: 'doge', to: 'btc', send: 50000, receive: 0.0742 },
  { from: 'btc', to: 'doge', send: 0.02, receive: 13478 },
  { from: 'trx', to: 'usdt', send: 10000, receive: 1620 },
  { from: 'usdt', to: 'trx', send: 200, receive: 1234 },
  { from: 'ada', to: 'eth', send: 1500, receive: 0.34 },
  { from: 'eth', to: 'sol', send: 1, receive: 22.4 },
  { from: 'bnb', to: 'usdt', send: 5, receive: 3187 },
  { from: 'xrp', to: 'btc', send: 1500, receive: 0.0085 },
  { from: 'ton', to: 'btc', send: 200, receive: 0.0094 },
  { from: 'ltc', to: 'btc', send: 10, receive: 0.0142 },
  { from: 'btc', to: 'ton', send: 0.05, receive: 1064 },
  { from: 'eth', to: 'matic', send: 1.2, receive: 5610 },
  { from: 'usdc', to: 'btc', send: 2500, receive: 0.0328 },
  { from: 'sol', to: 'usdt', send: 30, receive: 4862 },
  { from: 'btc', to: 'xrp', send: 0.04, receive: 7058 },
  { from: 'avax', to: 'btc', send: 50, receive: 0.0231 },
  { from: 'dot', to: 'eth', send: 200, receive: 0.45 },
];

interface ActivePoint {
  id: number;
  x: number;
  y: number;
  tx: Tx;
  /** Drives the CSS class — fade-in once mounted, fade-out before unmount. */
  visible: boolean;
}

const SHOW_MS = 100;
const HOLD_MS = 2400;
const HIDE_MS = 600;
const SPAWN_MIN_MS = 700;
const SPAWN_MAX_MS = 1700;
const MAX_CONCURRENT = 5;

export function GlobalMap() {
  const [points, setPoints] = useState<ActivePoint[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const timers = timersRef.current;

    const sched = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!cancelled) fn();
      }, ms);
      timers.add(t);
    };

    const spawn = () => {
      if (cancelled) return;
      // Cap concurrent points so the map doesn't clutter on slow tabs that
      // built up a queue during background.
      setPoints((prev) => {
        if (prev.length >= MAX_CONCURRENT) return prev;
        idRef.current += 1;
        const id = idRef.current;
        const [x, y] = EARTH_POINTS[Math.floor(Math.random() * EARTH_POINTS.length)]!;
        const tx = TXS_DATA[Math.floor(Math.random() * TXS_DATA.length)]!;
        const next = [...prev, { id, x, y, tx, visible: false }];
        sched(() => {
          setPoints((p) => p.map((q) => (q.id === id ? { ...q, visible: true } : q)));
        }, SHOW_MS);
        sched(() => {
          setPoints((p) => p.map((q) => (q.id === id ? { ...q, visible: false } : q)));
        }, SHOW_MS + HOLD_MS);
        sched(() => {
          setPoints((p) => p.filter((q) => q.id !== id));
        }, SHOW_MS + HOLD_MS + HIDE_MS);
        return next;
      });
      sched(spawn, SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS));
    };
    spawn();

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return (
    <div className="reach-map">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="reach-map-bg"
        src="/images/dotted-worldmap.svg"
        alt=""
        decoding="async"
      />
      <svg
        className="reach-map-overlay"
        viewBox="0 0 961 487"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {points.map((p) => (
          <g
            key={p.id}
            className={`reach-marker${p.visible ? ' is-visible' : ''}`}
            transform={`translate(${p.x} ${p.y})`}
          >
            <circle className="reach-marker-pulse" cx="0" cy="0" r="14" />
            <circle className="reach-marker-dot" cx="0" cy="0" r="5" />
            <foreignObject x="14" y="-30" width="220" height="60">
              <div className="reach-marker-label">
                <span className="reach-marker-row reach-marker-row-sent">
                  Sent <strong>{p.tx.send}</strong> {p.tx.from.toUpperCase()}
                </span>
                <span className="reach-marker-row reach-marker-row-got">
                  Got <strong>{p.tx.receive}</strong> {p.tx.to.toUpperCase()}
                </span>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
}
