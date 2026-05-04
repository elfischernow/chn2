import { APPS as APP_LINKS, PRODUCTS } from '@/lib/links';

const APPS: ReadonlyArray<{ name: string; sub: string; icon: string; href: string }> = [
  { name: 'iOS app', sub: 'iPhone & iPad', icon: '', href: APP_LINKS.ios },
  { name: 'Android app', sub: 'Phone & tablet', icon: '🤖', href: APP_LINKS.android },
  { name: 'MCP server', sub: 'For Claude, Cursor & co.', icon: '◇', href: PRODUCTS.mcp },
  { name: 'AI Hub', sub: 'Agents trade & swap on chain', icon: '✦', href: PRODUCTS.aiHub },
];

export function AppsEverywhere() {
  return (
    <section className="apps-section">
      <div className="apps-grid">
        <div className="apps-l">
          <div className="apps-phone">
            <div className="apps-phone-screen">
              <div className="apps-phone-row">
                <div className="apps-phone-bal">$12,484.20</div>
                <div className="apps-phone-pct up">+2.4%</div>
              </div>
              <div className="apps-phone-chart" />
              <div className="apps-phone-tiles">
                <div>Send</div><div>Buy</div><div>Swap</div><div>Earn</div>
              </div>
            </div>
          </div>
        </div>
        <div className="apps-r">
          <h2>
            One account.<br />
            <span className="tr-h2-light">Every surface.</span>
          </h2>
          <p className="apps-sub">
            Web, mobile, Telegram, browser extension. Same balances, same history, same login.
            Switch on the fly.
          </p>
          <div className="apps-list">
            {APPS.map((a) => (
              <a className="apps-btn" href={a.href} key={a.name}>
                <div className="apps-btn-ic">{a.icon}</div>
                <div className="apps-btn-text">
                  <div className="apps-btn-name">{a.name}</div>
                  <div className="apps-btn-sub">{a.sub}</div>
                </div>
                <div className="apps-btn-arrow">→</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
