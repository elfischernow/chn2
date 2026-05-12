'use client';

import { useState } from 'react';

import { LoanAprBadge } from '@/components/homepage/calculator/modes/loans/LoanAprBadge';
import { LoansView } from '@/components/homepage/calculator/modes/loans/LoansView';
import { useLoanCurrencies } from '@/components/homepage/calculator/modes/loans/useLoanCurrencies';
import { useLoanEstimate } from '@/components/homepage/calculator/modes/loans/useLoanEstimate';
import { formatAmount } from '@/components/homepage/calculator/shared/format';
import {
  buildLoanDeepLink,
  type LoanCurrency,
  type LoanEstimateResponse,
} from '@/lib/api/coin-rabbit';
import { useSession } from '@/lib/auth/useSession';
import { SITE_URL } from '@/lib/config';
import { useArrayFromFlatI18n, useI18n } from '@/lib/i18n/client';

import './crypto-loan.css';

const DEFAULTS = {
  from: 'USDT',
  to: 'BTC',
  fromNetwork: 'trx',
  toNetwork: 'btc',
  amount: '5000',
} as const;

interface BenefitItem {
  BENEFIT_ICON?: string;
  BENEFIT_TITLE?: string;
  BENEFIT_DESCRIPTION?: string;
}

interface StepSliderItem {
  SLIDE_HEADER?: string;
  SLIDE_TEXT?: string;
  SLIDE_IMAGE?: string;
  SLIDE_IMAGE_MOBILE?: string;
}

interface FaqQuestion {
  QUESTION?: string;
  ANSWER?: string;
  QUESTION_ID?: string;
}

interface FaqChapter {
  CHAPTER_HEADER?: string;
  CHAPTER_ID?: string;
  CHAPTER_QUESTIONS?: FaqQuestion[];
}

/**
 * Static /crypto-loan SEO landing. Ports the legacy `crypto-loan-page`
 * sections (main + how it works + make profit + FAQ) onto the new
 * calculator stack. Calculator is the shared `LoansView` — same lego the
 * homepage More-menu Loans tab and the /exchange More-tabs Loans tab use.
 *
 * The Bull / Bear "Rising market vs Falling market" tab switcher from
 * legacy is intentionally retired: both lists render side-by-side now,
 * matching the single-calculator-no-direction-toggle stance the rest of
 * the page takes.
 */
export function CryptoLoanPage() {
  const t = useI18n();
  const { session } = useSession();
  const isLoggedIn = session !== null;

  // ─── Calculator state ───────────────────────────────────────────────
  // Explicit `<string>` types — `DEFAULTS` is `as const`, so without the
  // annotation `useState` infers literal types (`"USDT"`, `"5000"`, …)
  // which would reject any subsequent `setFrom('BTC')`-style update.
  const [from, setFrom] = useState<string>(DEFAULTS.from);
  const [to, setTo] = useState<string>(DEFAULTS.to);
  const [fromNetwork, setFromNetwork] = useState<string>(DEFAULTS.fromNetwork);
  const [toNetwork, setToNetwork] = useState<string>(DEFAULTS.toNetwork);
  const [direction, setDirection] = useState<'direct' | 'reverse'>('direct');
  const [fromAmount, setFromAmount] = useState<string>(DEFAULTS.amount);
  const [toAmount, setToAmount] = useState<string>('');

  const loanLists = useLoanCurrencies(true);
  const depositList = loanLists.lists?.deposit ?? [];
  const loanList = loanLists.lists?.loan ?? [];
  const findLoan = (
    list: readonly LoanCurrency[],
    ticker: string,
    network: string,
  ): LoanCurrency | null => {
    const tk = ticker.toLowerCase();
    const nw = network.toLowerCase();
    const exact = list.find(
      (c) => c.currentTicker.toLowerCase() === tk && c.network.toLowerCase() === nw,
    );
    if (exact) return exact;
    return list.find((c) => c.currentTicker.toLowerCase() === tk) ?? null;
  };
  const fromCurrency = findLoan(depositList, from, fromNetwork);
  const toCurrency = findLoan(loanList, to, toNetwork);
  const driverAmount = direction === 'direct' ? fromAmount : toAmount;
  const { estimate, error, isLoading } = useLoanEstimate({
    fromCode: from,
    fromNetwork,
    toCode: to,
    toNetwork,
    amount: driverAmount,
    exchange: direction,
    enabled: true,
  });
  const [estimateRef, setEstimateRef] = useState<LoanEstimateResponse | null>(null);
  if (estimate && estimate !== estimateRef) {
    setEstimateRef(estimate);
    if (direction === 'direct' && estimate.amountTo != null) {
      setToAmount(formatAmount(estimate.amountTo));
    } else if (direction === 'reverse' && estimate.amountFrom != null) {
      setFromAmount(formatAmount(estimate.amountFrom));
    }
  }

  // ─── CTA target ─────────────────────────────────────────────────────
  const loanUrl = buildLoanDeepLink({
    from,
    fromNetwork,
    to,
    toNetwork,
    amount: driverAmount,
    base: SITE_URL,
  });
  const ctaHref = isLoggedIn
    ? loanUrl
    : `/registration?next=${encodeURIComponent(loanUrl)}`;

  // ─── Content arrays ─────────────────────────────────────────────────
  const benefits = useArrayFromFlatI18n('CRYPTO_LOAN_PAGE.MAIN_SCREEN.BENEFITS') as BenefitItem[];
  const stepSliderItems = useArrayFromFlatI18n(
    'CRYPTO_LOAN_PAGE.HOW_WORK_SCREEN.STEP_SLIDER',
  ) as StepSliderItem[];
  const risingMarketSteps = useArrayFromFlatI18n(
    'CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.RISING_MARKET.STEPS',
  ) as string[];
  const fallingMarketSteps = useArrayFromFlatI18n(
    'CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.FALLING_MARKET.STEPS',
  ) as string[];
  const faqData = useArrayFromFlatI18n('CRYPTO_LOAN_PAGE.FAQ_LOANS_SCREEN.FAQ') as FaqChapter[];

  // Same supported-coin glyph list the legacy section-how shows.
  const supportedCoins = [
    'btc', 'eth', 'bch', 'firo', 'nano', 'doge', 'xrp', 'dgb', 'uni', 'link',
    'mkr', 'snx', 'comp', 'enj', 'bat', 'shushi', 'yfi', 'zrx', 'ftm', 'bnt', 'xmr',
  ];

  return (
    <main className="cl-page">
      {/* ─── Main offer + calculator ─────────────────────────────── */}
      <section className="cl-section cl-section-dark">
        <div className="cl-container">
          <div className="cl-main-offer">
            <div className="cl-main-offer-text">
              <h1 className="cl-main-header">
                {t('CRYPTO_LOAN_PAGE.MAIN_SCREEN.TITLE') || 'Crypto loans'}
              </h1>
              <p className="cl-main-text">
                {t('CRYPTO_LOAN_PAGE.MAIN_SCREEN.DESCRIPTION') || ''}
              </p>
            </div>

            <div className="cl-main-calc">
              <div className="widget">
                <LoansView
                  depositList={depositList}
                  loanList={loanList}
                  from={from}
                  fromNetwork={fromNetwork}
                  fromAmount={fromAmount}
                  to={to}
                  toNetwork={toNetwork}
                  toAmount={toAmount}
                  fromCurrency={fromCurrency}
                  toCurrency={toCurrency}
                  hasError={Boolean(error) || estimate?.errorCode != null}
                  showSkeletonFrom={isLoading && direction === 'reverse'}
                  showSkeletonTo={isLoading && direction === 'direct'}
                  estimate={estimate}
                  isCurrenciesLoading={loanLists.isLoading}
                  onSelectFrom={(c) => {
                    setFrom(c.currentTicker.toUpperCase());
                    setFromNetwork(c.network);
                    const def = c.loanDepositDefaultAmount;
                    if (def != null) setFromAmount(String(def));
                  }}
                  onSelectTo={(c) => {
                    setTo(c.currentTicker.toUpperCase());
                    setToNetwork(c.network);
                  }}
                  onFromAmountChange={(value) => {
                    setDirection('direct');
                    setFromAmount(value);
                  }}
                  onToAmountChange={(value) => {
                    setDirection('reverse');
                    setToAmount(value);
                  }}
                />
                <div className="cl-calc-foot">
                  <LoanAprBadge estimate={estimate} isLoading={isLoading} />
                  {estimate?.errorCode === 'INVALID_PAIR' && (
                    <p className="cl-calc-err" role="status">
                      This loan pair is not supported at the moment.
                    </p>
                  )}
                </div>
                <a className="swap-cta" href={ctaHref}>
                  {t('LOANS.CALCULATOR.GET_LOAN') || 'Get Loan'}
                </a>
              </div>
            </div>
          </div>

          <div className="cl-main-benefits">
            {benefits.map((item, i) => (
              <div className="cl-main-benefit" key={item?.BENEFIT_TITLE ?? i}>
                {item?.BENEFIT_ICON && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="cl-main-benefit-icon"
                    src={item.BENEFIT_ICON}
                    alt={item.BENEFIT_TITLE ?? ''}
                  />
                )}
                <div className="cl-main-benefit-title">{item?.BENEFIT_TITLE}</div>
                <p className="cl-main-benefit-text">{item?.BENEFIT_DESCRIPTION}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────── */}
      <section className="cl-section">
        <div className="cl-container">
          <h2 className="cl-section-header">
            {t('CRYPTO_LOAN_PAGE.HOW_WORK_SCREEN.TITLE') || 'How it works'}
          </h2>
          <ol className="cl-steps">
            {stepSliderItems.map((item, i) => (
              <li className="cl-step" key={item?.SLIDE_HEADER ?? i}>
                {item?.SLIDE_IMAGE && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="cl-step-image" src={item.SLIDE_IMAGE} alt="" />
                )}
                <div className="cl-step-body">
                  <h3 className="cl-step-title">{item?.SLIDE_HEADER}</h3>
                  <p className="cl-step-text">{item?.SLIDE_TEXT}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="cl-supported">
            <div className="cl-supported-title">
              {t('CRYPTO_LOAN_PAGE.HOW_WORK_SCREEN.SUPPORTED_ASSETS') || 'Supported assets'}
            </div>
            <div className="cl-supported-coins">
              {supportedCoins.map((coin) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={coin}
                  className="cl-supported-coin"
                  src={`/images/crypto-loan/coins/${coin}.svg`}
                  alt={coin.toUpperCase()}
                  title={coin.toUpperCase()}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Make profit (Rising + Falling, no toggle) ────────────── */}
      <section className="cl-section cl-section-dark">
        <div className="cl-container">
          <h2 className="cl-section-header">
            {t('CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.TITLE') || 'Make profit with crypto loans'}
          </h2>
          <p className="cl-section-sub">
            {t('CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.DESCRIPTION') || ''}
          </p>

          <div className="cl-profit-grid">
            <div className="cl-profit-card">
              <div className="cl-profit-card-header">
                {t('CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.RISING_MARKET.HEADER') || 'Rising market'}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cl-profit-card-image" src="/images/crypto-loan/rise.svg" alt="" />
              <ul className="cl-profit-card-list">
                {risingMarketSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="cl-profit-card">
              <div className="cl-profit-card-header">
                {t('CRYPTO_LOAN_PAGE.MAKE_PROFIT_SCREEN.FALLING_MARKET.HEADER') || 'Falling market'}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cl-profit-card-image" src="/images/crypto-loan/falling.svg" alt="" />
              <ul className="cl-profit-card-list">
                {fallingMarketSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section className="cl-section">
        <div className="cl-container">
          <h2 className="cl-section-header">
            {t('CRYPTO_LOAN_PAGE.FAQ_LOANS_SCREEN.TITLE') || 'FAQ'}
          </h2>
          <div className="cl-faq">
            {faqData.map((chapter) => (
              <div className="cl-faq-chapter" key={chapter?.CHAPTER_ID}>
                {chapter?.CHAPTER_HEADER && (
                  <h3 className="cl-faq-chapter-header">{chapter.CHAPTER_HEADER}</h3>
                )}
                {(chapter?.CHAPTER_QUESTIONS ?? []).map((q) => (
                  <details className="cl-faq-item" key={q?.QUESTION_ID}>
                    <summary className="cl-faq-question">{q?.QUESTION}</summary>
                    <div
                      className="cl-faq-answer"
                      dangerouslySetInnerHTML={{ __html: q?.ANSWER ?? '' }}
                    />
                  </details>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
