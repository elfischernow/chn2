import { ACCOUNT, BUSINESS } from '@/lib/links';

const PRO_FEATURES = [
  'Cashback on every swap',
  'Off-chain swaps with lower fees',
  'Full history & AML reports',
  'Crypto-backed loans access',
  'Priority customer support',
];

const VIP_FEATURES = [
  'Custom rates, zero spreads',
  'Dedicated account manager',
  'Higher limits, OTC desk access',
  'Early access to new products',
  'Direct line to engineering',
];

export function AccountTiers() {
  return (
    <section className="tiers-section">
      <div className="tiers-head">
        <h2>
          Pick the seat <span className="tr-h2-light">that fits.</span>
        </h2>
      </div>
      <div className="tiers-grid">
        <article className="tier-card pro">
          <div className="tier-tag">For everyone</div>
          <h3 className="tier-h">Pro<br />account</h3>
          <p className="tier-sub">
            Free upgrade for verified users. Better rates, deeper features, full history — at no
            extra cost.
          </p>
          <ul className="tier-list">
            {PRO_FEATURES.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <a className="btn btn-primary btn-lg tier-cta" href={ACCOUNT.signup}>Start free</a>
        </article>
        <article className="tier-card vip">
          <div className="tier-tag">From $100k volume</div>
          <h3 className="tier-h">VIP<br />tier</h3>
          <p className="tier-sub">
            For serious capital. White-glove service, custom liquidity, real humans on call.
          </p>
          <ul className="tier-list">
            {VIP_FEATURES.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <a
            className="btn btn-lg tier-cta"
            href={BUSINESS.contactBd}
            style={{ background: '#fff', color: '#0F0F14' }}
          >
            Talk to sales →
          </a>
        </article>
      </div>
    </section>
  );
}
