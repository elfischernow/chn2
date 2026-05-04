import {
  getCryptorankId,
  getSparkline,
  isCryptorankConfigured,
  resolveCryptorankIdBySymbol,
} from '@/lib/api/cryptorank';

import { CryptorankChart } from '../charts/CryptorankChart';
import { PairCryptorankChart } from '../charts/PairCryptorankChart';
import { TradingViewChart } from '../charts/TradingViewChart';
import { RichText } from './RichText';
import styles from './blocks.module.css';
import type { BlockProps } from './types';

/**
 * `currency-flow.price-chart` — live area chart for the active coin or
 * pair. Three rendering paths:
 *
 *   1. Cryptorank (self-rendered recharts area chart). Used when both
 *      sides have a Cryptorank ID and the upstream is configured. We
 *      prefetch the default 1Y window on the server so the SSR'd HTML
 *      already carries enough data to draw the first frame — matters
 *      for LCP and crawlers (the chart UI is the page's signal that
 *      this is a real exchange surface, not a thin landing).
 *
 *   2. TradingView fallback. Used when Cryptorank can't price the coin
 *      (no ID in the static lookup, or the upstream isn't wired). The
 *      MediumWidget mounts client-side; SSR ships the chart shell.
 *
 *   3. Title + admin copy only. Last-resort when even TradingView would
 *      be wrong (no recognizable spot symbol). Keeps the heading in the
 *      page outline so crawlers still see it.
 *
 * On pair pages we override the CMS title (which sometimes ships
 * reversed, e.g. "Monero to Bitcoin Live Price Chart" on /btc/xmr) with
 * a directional one built from the actual page tickers.
 */
export async function PriceChart({ block, page, counter }: BlockProps) {
  const adminTitle = (block.title as string) ?? '';
  const description = (block.description as string) ?? '';

  const fromTicker = page.ticker.toUpperCase();
  const toTicker = counter?.ticker.toUpperCase();

  const title = counter
    ? `${fromTicker} to ${toTicker} Live Price Chart`
    : adminTitle || `${page.name || fromTicker} (${fromTicker}) Live Price Chart`;

  // Static map first, then a live `/currencies?symbol=…` lookup as a
  // self-healing fallback (mirrors the legacy SPA's behaviour). The
  // dynamic call is cached for a week, so a single page miss isn't
  // hot-path expensive and the static `ids.json` doesn't need to be
  // perfect the moment a new coin lands in the catalog.
  const fromCRId =
    getCryptorankId(page.link) ??
    (await resolveCryptorankIdBySymbol(page.ticker));
  const toCRId = counter
    ? getCryptorankId(counter.link) ?? (await resolveCryptorankIdBySymbol(counter.ticker))
    : null;

  // ─── Pair page ──────────────────────────────────────────────
  if (counter) {
    if (fromCRId && toCRId && isCryptorankConfigured()) {
      const [initialFrom, initialTo] = await Promise.all([
        getSparkline(fromCRId, '1Y'),
        getSparkline(toCRId, '1Y'),
      ]);
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <PairCryptorankChart
            fromCryptorankId={fromCRId}
            toCryptorankId={toCRId}
            fromName={page.name || fromTicker}
            toName={counter.name || toTicker!}
            toTicker={counter.ticker}
            fromIconUrl={page.iconUrl}
            initialFrom={initialFrom}
            initialTo={initialTo}
          />
          {description.trim() && <RichText content={description} />}
        </section>
      );
    }
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <TradingViewChart
          symbol={tradingViewPairSymbol(page.ticker, counter.ticker)}
          label={`${page.name || fromTicker} / ${counter.name || toTicker}`}
        />
        {description.trim() && <RichText content={description} />}
      </section>
    );
  }

  // ─── Coin page ──────────────────────────────────────────────
  if (fromCRId && isCryptorankConfigured()) {
    const initial = await getSparkline(fromCRId, '1Y');
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <CryptorankChart
          cryptorankId={fromCRId}
          coinName={page.name || fromTicker}
          coinIconUrl={page.iconUrl}
          initial={initial}
        />
        {description.trim() && <RichText content={description} />}
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <TradingViewChart
        symbol={tradingViewCoinSymbol(page.ticker)}
        label={`${page.name || fromTicker} / U.S. Dollar`}
      />
      {description.trim() && <RichText content={description} />}
    </section>
  );
}

/**
 * Compose a TradingView spot symbol for a single coin. Defaults to
 * Binance USDT pair (highest reach across the catalog); a few tickers
 * route to other venues because Binance delisted them (XMR most notably)
 * or because they're stables themselves.
 */
function tradingViewCoinSymbol(ticker: string): string {
  const t = ticker.toUpperCase();
  if (t === 'XMR') return 'KRAKEN:XMRUSD';
  if (t === 'USDT' || t === 'USDC' || t === 'BUSD') return `KRAKEN:${t}USD`;
  return `BINANCE:${t}USDT`;
}

/**
 * Compose a TradingView spot symbol for a pair. TradingView only renders
 * direct spot symbols — it can't synthesize a cross-rate from two USD
 * legs. For exotic pairs (anything involving XMR or other Binance-
 * delisted assets) we route to Kraken, which carries most of them. The
 * self-rendered Cryptorank chart is the canonical solution; this is a
 * best-effort fallback when the env isn't wired and many obscure pair
 * combinations will still hit "Invalid symbol".
 *
 * Kraken's BTC ticker is `XBT`, so we translate when the pair lands on
 * Kraken via the delisted-on-Binance list.
 */
function tradingViewPairSymbol(fromTicker: string, toTicker: string): string {
  const f = fromTicker.toUpperCase();
  const t = toTicker.toUpperCase();
  const krakenOnly = new Set(['XMR', 'ZEC', 'DASH']);
  if (krakenOnly.has(f) || krakenOnly.has(t)) {
    const kf = f === 'BTC' ? 'XBT' : f;
    const kt = t === 'BTC' ? 'XBT' : t;
    return `KRAKEN:${kf}${kt}`;
  }
  return `BINANCE:${f}${t}`;
}
