import { GlobalMap } from './GlobalMap';

export function GlobalReach() {
  return (
    <section className="reach-section">
      <div className="reach-grid">
        <GlobalMap />
        <div className="reach-r">
          <h2>
            Built for <span className="tr-h2-light">the planet.</span>
          </h2>
          <div className="reach-stats">
            <div className="reach-stat">
              <strong>200+ countries</strong>
              <span>where ChangeNOW operates today</span>
            </div>
            <div className="reach-stat">
              <strong>50+ fiat currencies</strong>
              <span>for buying crypto via card or bank</span>
            </div>
            <div className="reach-stat">
              <strong>110+ blockchains</strong>
              <span>supported across our products</span>
            </div>
            <div className="reach-stat">
              <strong>22 languages</strong>
              <span>localized support and docs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
