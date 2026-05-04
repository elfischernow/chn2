import { Coin } from '@/components/homepage/Coin';
import { getCurrencies } from '@/lib/api/currencies';
import type { CoinPage, PairPage } from '@/lib/api/content/types';
import { PRODUCTS } from '@/lib/links';
import type { TranslationDict } from '@/lib/i18n/createT';
import { createT } from '@/lib/i18n/createT';

import { PresetSwapWidget } from './PresetSwapWidget';
import styles from './hero.module.css';

interface Props {
  page: CoinPage | PairPage;
  dict: TranslationDict;
  /** Title override — pair pages pass "BTC to ETH …" copy here. */
  titleOverride?: string;
  /** Description override — pair pages format their own copy. */
  descriptionOverride?: string;
  /** Pair-page extras to surface alongside the coin icon in the hero. */
  counterTicker?: string;
  counterNetwork?: string;
  counterIconUrl?: string | null;
}

/**
 * Coin / pair page hero. Two-column on desktop (left: title + description +
 * trust strip; right: live swap widget). Mirrors legacy
 * `index-header-by-pairs` / `header-pair-main` SEO surface — the calculator
 * is the chief signal that this is a "real" exchange page, not a thin
 * landing page; without it both Google Quality and conversion suffer.
 */
export async function CoinHero({
  page,
  dict,
  titleOverride,
  descriptionOverride,
  counterTicker,
  counterNetwork,
  counterIconUrl,
}: Props) {
  const t = createT(dict);
  const fromTicker = page.ticker.toUpperCase();
  // h1 prefers Strapi `title` (e.g. "Cardano (ADA) Crypto Exchange") over
  // `meta_title` (which is SEO-tuned for the document `<title>` and is
  // verbose: "ADA Crypto Price, Market Cap, Converter to USD").
  // Mirrors legacy `index-header-by-pairs--title` source-of-truth.
  const heroTitle =
    titleOverride ||
    (page.title && page.title.trim()) ||
    `${page.name || fromTicker} (${fromTicker}) Crypto Exchange`;
  const heroDescription =
    descriptionOverride ||
    page.description ||
    t('CURRENCIES_HEADER.PARAGRAPH_TEMPLATE', '', {
      name: page.name,
      ticker: fromTicker,
    });

  return (
    <section className={styles.hero}>
      <div className={styles.heroLeft}>
        <div className={styles.iconRow}>
          <Coin symbol={fromTicker} iconUrl={page.iconUrl} size={48} />
          {counterTicker && (
            <>
              <span className={styles.iconArrow} aria-hidden>
                →
              </span>
              <Coin
                symbol={counterTicker.toUpperCase()}
                iconUrl={counterIconUrl ?? null}
                size={48}
              />
            </>
          )}
        </div>
        <h1 className={styles.title}>{heroTitle}</h1>
        {heroDescription && <p className={styles.subtitle}>{heroDescription}</p>}
        <div className={styles.appLinks}>
          <a
            className={styles.appIconLink}
            href="https://play.google.com/store/apps/details?id=io.changenow.changenow"
            rel="nofollow noopener"
            target="_blank"
            aria-label="Get it on Google Play"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/currencies/googleplay-circle.svg"
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
            />
          </a>
          <a
            className={styles.appIconLink}
            href="https://apps.apple.com/us/app/id1518003605"
            rel="nofollow noopener"
            target="_blank"
            aria-label="Download on the App Store"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/currencies/apple-circle.svg"
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
      <div className={styles.heroRight}>
        {/* No Suspense — `SwapWidgetSlot` is async and awaits the catalog
            before returning. The client-component `SwapWidget` it renders
            still pre-renders to HTML so the calculator outline ships in the
            SSR'd payload (matters for SEO and JS-off readers, per Q4). */}
        <SwapWidgetSlot
          fromTicker={page.ticker}
          fromNetwork={page.network}
          toTicker={counterTicker?.toLowerCase()}
          toNetwork={counterNetwork?.toLowerCase()}
        />
      </div>

      <div className={styles.heroFooter}>
        <a className={styles.payStrip} href={PRODUCTS.buyCrypto}>
          <span>{t('MAIN.BUY_CRYPTO', 'Buy crypto with card')}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.payIcons}
            src="/images/currencies/visa-master.svg"
            alt="Visa Mastercard"
            width={114}
            height={32}
            loading="lazy"
            decoding="async"
          />
        </a>
        <a
          className={styles.trustpilotStrip}
          href="https://www.trustpilot.com/review/changenow.io"
          rel="nofollow noopener"
          target="_blank"
        >
          ★ Trustpilot · Excellent
        </a>
      </div>
    </section>
  );
}

async function SwapWidgetSlot({
  fromTicker,
  fromNetwork,
  toTicker,
  toNetwork,
}: {
  fromTicker: string;
  fromNetwork: string;
  toTicker?: string;
  toNetwork?: string;
}) {
  const currencies = await getCurrencies();
  return (
    <PresetSwapWidget
      currencies={currencies}
      fromTicker={fromTicker}
      fromNetwork={fromNetwork}
      toTicker={toTicker}
      toNetwork={toNetwork}
    />
  );
}
