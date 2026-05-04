import { buildExchangeUrl } from '@/lib/api/exchange';
import { LEARN } from '@/lib/links';

// Live rates list. Liquidity widths are deterministic so SSR & client agree.
// In production these would come from a server-cached fetch on a 60s revalidate.

const PAIRS: ReadonlyArray<{
  from: string;
  to: string;
  rate: string;
  d: string;
  up: boolean;
  liq: number;
}> = [
  { from: 'BTC', to: 'ETH', rate: '33.08', d: '+1.4', up: true, liq: 92 },
  { from: 'USDT', to: 'BTC', rate: '0.0000146', d: '−0.3', up: false, liq: 78 },
  { from: 'ETH', to: 'USDT', rate: '2,068.40', d: '+0.8', up: true, liq: 95 },
  { from: 'SOL', to: 'USDT', rate: '142.30', d: '+2.1', up: true, liq: 84 },
  { from: 'XMR', to: 'BTC', rate: '0.00251', d: '−1.2', up: false, liq: 62 },
  { from: 'USDC', to: 'EUR', rate: '0.92', d: '+0.1', up: true, liq: 71 },
];

export function RatesLiquidity() {
  return (
    <section className="rates-section">
      <div className="rates-head">
        <div>
          <div className="rates-pulse">
            <span className="rates-pulse-dot" />
            <span>Live · updated 2s ago</span>
          </div>
          <h2>Best rates.<br />Deep books.</h2>
          <p className="rates-sub">
            Aggregated across 100+ web3 and CEX sources. Live spot, no hidden markup.
          </p>
        </div>
        <div className="rates-stats">
          <div><strong>1,261</strong><span>currencies</span></div>
          <div><strong>110+</strong><span>chains</span></div>
          <div><strong>$2.4B</strong><span>30d volume</span></div>
        </div>
      </div>
      <div className="rates-table">
        <div className="rates-row head">
          <span>Pair</span><span>Rate</span><span>24h</span><span>Liquidity</span><span></span>
        </div>
        {PAIRS.map((p, i) => (
          <div className="rates-row" key={i}>
            <span className="rates-pair">
              <span className="rates-coin">{p.from}</span>
              <span className="rates-arrow">→</span>
              <span className="rates-coin">{p.to}</span>
            </span>
            <span className="rates-rate">1 = {p.rate}</span>
            <span className={`rates-delta ${p.up ? 'up' : 'dn'}`}>{p.d}%</span>
            <span className="rates-liq">
              <span className="rates-liq-bar">
                <span style={{ width: `${p.liq}%` }} />
              </span>
            </span>
            <a className="rates-cta" href={buildExchangeUrl({ from: p.from, to: p.to, amount: '0.1' })}>
              Explore →
            </a>
          </div>
        ))}
      </div>
      <a className="rates-all" href={LEARN.allCurrencies}>View all 1,261 currencies →</a>
    </section>
  );
}
