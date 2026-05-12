'use client';

import { useRef, useState } from 'react';

import { BUSINESS, FAMILY, LEARN, PRODUCTS, SITE_URL, SUPPORT } from '@/lib/links';

import './for-partners.css';

interface StatItem {
  num: string;
  label: string;
}

const STATS: StatItem[] = [
  { num: '1500+', label: 'Cryptos & Fiats' },
  { num: '28', label: 'Solutions & Services' },
  { num: '∞', label: 'Liquidity & Opportunities' },
];

interface PartnerLogo {
  name: string;
  href: string;
}

// Names match the legacy "Trusted by" carousel; visual chips are rendered
// from initials so the page doesn't ship a 30-PNG logo bundle on first
// load. Hover swaps to the full word so partners stay legible at a glance.
const TRUSTED_BY: PartnerLogo[] = [
  { name: 'Guarda', href: 'https://guarda.com' },
  { name: 'Trezor', href: 'https://trezor.io' },
  { name: 'Bitcoin.com', href: 'https://bitcoin.com' },
  { name: 'Edge', href: 'https://edge.app' },
  { name: 'Cake Wallet', href: 'https://cakewallet.com' },
  { name: 'Ballet', href: 'https://www.ballet.com' },
  { name: 'Guardarian', href: 'https://guardarian.com' },
  { name: 'CoinRabbit', href: 'https://coinrabbit.io' },
];

interface SolutionCard {
  title: string;
  text?: string;
  href: string;
  tone: 'orange' | 'green' | 'violet' | 'blue';
}

const CRYPTO_EXCHANGE: SolutionCard[] = [
  { title: 'API', tone: 'blue', href: BUSINESS.api },
  { title: 'Widget', tone: 'green', href: BUSINESS.widget },
  { title: 'White Label Exchange', tone: 'violet', href: BUSINESS.whiteLabel },
  { title: 'Telegram Bot', tone: 'orange', href: `${SITE_URL}/telegram-bot` },
  { title: 'Permanent Swap Address', tone: 'green', href: `${SITE_URL}/swap` },
];

const ASSET_SERVICES: SolutionCard[] = [
  {
    title: 'Asset Listing',
    text: 'Get your coin or token listed on ChangeNOW and access 2,250,000+ exchange pairs.',
    tone: 'orange',
    href: `${SITE_URL}/asset-listing`,
  },
  {
    title: 'Multichain Bridge',
    text: 'Enable crypto exchange for your asset even if it isn’t listed on any CEX or DEX.',
    tone: 'green',
    href: PRODUCTS.bridge,
  },
  {
    title: 'Warm Wallet',
    text: 'Manage your project’s crypto funds with high security and transaction speed.',
    tone: 'violet',
    href: `${SITE_URL}/warm-wallets`,
  },
];

const ENTERPRISE: SolutionCard[] = [
  {
    title: 'White Label Wallet',
    text: 'Launch a monetised non-custodial cryptocurrency wallet with built-in crypto exchange.',
    tone: 'blue',
    href: `${SITE_URL}/your-wallet`,
  },
  {
    title: 'Market Info API',
    text: 'Get real-time market rates for over 9,000 cryptocurrencies.',
    tone: 'orange',
    href: `${SITE_URL}/market-info-api`,
  },
];

interface EcosystemCard {
  brand: string;
  text: string;
  href: string;
  tone: 'orange' | 'green' | 'violet' | 'blue';
}

const ECOSYSTEM: EcosystemCard[] = [
  {
    brand: 'NOW Custody',
    text: 'Enhance your platform with limitless access to blockchain operations.',
    tone: 'violet',
    href: FAMILY.nowCustody,
  },
  {
    brand: 'NowPayments',
    text: 'Empower businesses with your asset — let users pay for services and goods.',
    tone: 'blue',
    href: FAMILY.nowPayments,
  },
  {
    brand: 'NOWNodes',
    text: 'Create a public node on NOWNodes and boost your asset’s adoption.',
    tone: 'green',
    href: FAMILY.nowNodes,
  },
];

interface Benefit {
  title: string;
  text: string;
}

const BENEFITS: Benefit[] = [
  {
    title: 'Boost your profit',
    text: 'Solutions for any business, with numerous ways to maximise your earnings.',
  },
  {
    title: 'Top security',
    text: 'Crypto Defenders Alliance member with a proven AML track record.',
  },
  {
    title: '1500+ assets',
    text: 'Access both CEX and DEX liquidity and thousands of exchange pairs.',
  },
  {
    title: '99.999% uptime',
    text: 'Our codebase is hosted on separate servers across data centers.',
  },
  {
    title: 'Flexible integration',
    text: 'Services match seamlessly with different platforms and business processes.',
  },
  {
    title: 'Always at your service',
    text: '24/7 support, personal manager assistance always available.',
  },
];

interface FaqItem {
  q: string;
  a: string;
}

interface FaqChapter {
  title: string;
  items: FaqItem[];
}

const FAQ: FaqChapter[] = [
  {
    title: 'General',
    items: [
      {
        q: 'How does ChangeNOW work?',
        a: 'Fill in the exchange details, deposit your crypto, and receive the swapped asset — typically in about five minutes. ChangeNOW sources liquidity from multiple CEXs and DEXs (Binance, OKX, Uniswap, KuCoin and more) to give you the best rate available at the moment of the swap.',
      },
      {
        q: 'How can I earn with ChangeNOW?',
        a: 'You can set your own commission starting from 0.4% and earn from every user transaction routed through your integration.',
      },
      {
        q: 'Do you offer any discounts or privilege programs?',
        a: 'Yes. Partner level depends on the total exchange turnover per month and is valid for the next two months. Higher levels unlock improved rates and dedicated support.',
      },
    ],
  },
  {
    title: 'Integration',
    items: [
      {
        q: 'Do you have an integration fee?',
        a: 'No. Integration and set-up are completely free. You can test our solutions with no initial investment.',
      },
      {
        q: 'How do I start the integration?',
        a: 'Sign up for a business account, generate your API key, and follow the docs. Our team is available to assist throughout the integration.',
      },
    ],
  },
  {
    title: 'Exchange flow',
    items: [
      {
        q: 'How fast will the exchange be processed?',
        a: 'On average, it takes about 5 minutes. The exact time depends on the coin’s network congestion.',
      },
      {
        q: 'What are the minimum and maximum amounts for an exchange?',
        a: 'There is no upper limit. Lower limits are different for each coin and range from ~$1.7 to $20.',
      },
    ],
  },
];

interface Manager {
  name: string;
  role: string;
  tg: string;
  ln: string;
}

const TEAM: Manager[] = [
  { name: 'Sophia', role: 'Business Development', tg: 'https://t.me/sophia_now', ln: 'https://www.linkedin.com/in/sophia-changenow' },
  { name: 'Saad', role: 'Business Development', tg: 'https://t.me/saad_now', ln: 'https://www.linkedin.com/in/saad-changenow' },
  { name: 'Anastasia', role: 'Business Development', tg: 'https://t.me/anastasia_now', ln: 'https://www.linkedin.com/in/anastasia-changenow' },
];

const BOOK_A_CALL = 'https://calendly.com/changenow-bd';

export function ForPartnersPage() {
  const contactRef = useRef<HTMLDivElement>(null);
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // The audience switch is pinned to Business by the Header's
  // route-watching effect (see Header.tsx) whenever the pathname starts
  // with `/for-partners`. The page no longer needs to call
  // `setHeaderMode` itself.

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleQuestion = (key: string) => {
    setOpenQuestion((cur) => (cur === key ? null : key));
  };

  return (
    <div className="for-partners">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="fp-hero">
        <div className="fp-container fp-hero__inner">
          <div className="fp-hero__left">
            <h1 className="fp-hero__title">
              Cryptocurrency Exchange, Processing and Custody
            </h1>
            <p className="fp-hero__sub">
              Enhance your business with crypto rails. Integrate our adaptable
              solutions and give your customers access to 1500+ assets at
              competitive rates.
            </p>
            <div className="fp-hero__cta">
              <button
                type="button"
                className="fp-btn fp-btn--primary"
                onClick={scrollToContact}
              >
                Contact us
              </button>
              <a
                className="fp-btn fp-btn--ghost"
                href={`${BUSINESS.api}?utm_source=for-partners`}
                rel="noreferrer"
              >
                Get free API key
              </a>
            </div>
            <div className="fp-hero__stats">
              {STATS.map((s) => (
                <div key={s.label} className="fp-stat">
                  <div className="fp-stat__num">{s.num}</div>
                  <div className="fp-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="fp-hero__right" aria-hidden>
            <div className="fp-hero__art">
              <span className="fp-hero__blob fp-hero__blob--a" />
              <span className="fp-hero__blob fp-hero__blob--b" />
              <span className="fp-hero__blob fp-hero__blob--c" />
            </div>
          </div>
        </div>
        <div className="fp-container fp-trust">
          <div className="fp-trust__label">Trusted by:</div>
          <ul className="fp-trust__list">
            {TRUSTED_BY.map((p) => (
              <li key={p.name}>
                <a href={p.href} target="_blank" rel="noreferrer">
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── NOW Solutions ────────────────────────────────── */}
      <section className="fp-section">
        <div className="fp-container">
          <h2 className="fp-section__title">NOW Solutions</h2>

          <div className="fp-cat fp-cat--exchange">
            <div className="fp-cat__intro">
              <h3 className="fp-cat__title">Crypto Exchange</h3>
              <p className="fp-cat__text">
                Generate consistent profit with crypto exchange. Plug in
                solutions that give your customers access to 1500+ assets and
                competitive rates.
              </p>
              <a className="fp-cat__link" href={`${SITE_URL}/crypto-exchange`}>
                Explore all exchange products →
              </a>
            </div>
            <div className="fp-cat__grid fp-cat__grid--five">
              {CRYPTO_EXCHANGE.map((item) => (
                <a
                  key={item.title}
                  className={`fp-card fp-card--solid fp-card--${item.tone}`}
                  href={item.href}
                >
                  <span className="fp-card__title">{item.title}</span>
                  <span className="fp-card__arrow">→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="fp-cat">
            <h3 className="fp-cat__title">Asset Services</h3>
            <div className="fp-cat__grid fp-cat__grid--three">
              {ASSET_SERVICES.map((item) => (
                <a
                  key={item.title}
                  className={`fp-card fp-card--light fp-card--${item.tone}`}
                  href={item.href}
                >
                  <span className="fp-card__title">{item.title}</span>
                  <span className="fp-card__text">{item.text}</span>
                  <span className="fp-card__arrow">→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="fp-cat">
            <h3 className="fp-cat__title">Earn as a Referral</h3>
            <a
              className="fp-card fp-card--wide fp-card--green"
              href={BUSINESS.referral}
            >
              <div>
                <span className="fp-card__title">Referral Program</span>
                <span className="fp-card__text">
                  Share unique affiliate links generated just for you and get
                  paid for every exchange made via your links.
                </span>
              </div>
              <span className="fp-card__arrow">→</span>
            </a>
          </div>

          <div className="fp-cat">
            <h3 className="fp-cat__title">Enterprise solutions</h3>
            <div className="fp-cat__grid fp-cat__grid--two">
              {ENTERPRISE.map((item) => (
                <a
                  key={item.title}
                  className={`fp-card fp-card--light fp-card--${item.tone}`}
                  href={item.href}
                >
                  <span className="fp-card__title">{item.title}</span>
                  <span className="fp-card__text">{item.text}</span>
                  <span className="fp-card__arrow">→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="fp-cat">
            <h3 className="fp-cat__title">NOW Ecosystem</h3>
            <div className="fp-cat__grid fp-cat__grid--three">
              {ECOSYSTEM.map((item) => (
                <a
                  key={item.brand}
                  className={`fp-card fp-card--light fp-card--${item.tone}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="fp-card__brand">{item.brand}</span>
                  <span className="fp-card__text">{item.text}</span>
                  <span className="fp-card__arrow">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Enhance any business ─────────────────────────── */}
      <section className="fp-section fp-enhance">
        <div className="fp-container fp-enhance__inner">
          <div className="fp-enhance__copy">
            <h2 className="fp-section__title">Enhance any business</h2>
            <p className="fp-enhance__text">
              ChangeNOW provides a comprehensive approach and a set of handy
              tools to cover the needs of any business — from coins and
              wallets to centralised and decentralised exchanges.
            </p>
            <div className="fp-hero__cta">
              <a
                className="fp-btn fp-btn--primary"
                href={`${BUSINESS.api}?utm_source=for-partners-enhance`}
              >
                Get Started
              </a>
              <button
                type="button"
                className="fp-btn fp-btn--ghost"
                onClick={scrollToContact}
              >
                Contact us
              </button>
            </div>
          </div>
          <div className="fp-enhance__art" aria-hidden>
            <div className="fp-enhance__ring fp-enhance__ring--a" />
            <div className="fp-enhance__ring fp-enhance__ring--b" />
            <div className="fp-enhance__ring fp-enhance__ring--c" />
          </div>
        </div>
      </section>

      {/* ─── Expand your business benefits ────────────────── */}
      <section className="fp-section">
        <div className="fp-container">
          <h2 className="fp-section__title">Expand your business with ChangeNOW</h2>
          <div className="fp-benefits">
            {BENEFITS.map((b, i) => (
              <div className="fp-benefit" key={b.title}>
                <div className="fp-benefit__num">{String(i + 1).padStart(2, '0')}</div>
                <div className="fp-benefit__title">{b.title}</div>
                <div className="fp-benefit__text">{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Partners community ───────────────────────────── */}
      <section className="fp-section fp-section--soft">
        <div className="fp-container">
          <h2 className="fp-section__title">Join our Partners&rsquo; Community</h2>
          <p className="fp-section__sub">
            These services are already collaborating with us.
          </p>
          <div className="fp-community">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((p, i) => (
              <a
                className="fp-community__chip"
                href={p.href}
                key={`${p.name}-${i}`}
                target="_blank"
                rel="noreferrer"
              >
                {p.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Press ────────────────────────────────────────── */}
      <section className="fp-section">
        <div className="fp-container">
          <h2 className="fp-section__title">Press about us</h2>
          <p className="fp-section__sub">
            Check out what various media outlets have to say about ChangeNOW.
          </p>
          <div className="fp-press">
            <a
              className="fp-press__card"
              href="https://www.investing.com"
              target="_blank"
              rel="noreferrer"
            >
              <span className="fp-press__src">Investing.com</span>
              <span className="fp-press__title">
                ChangeNOW Visa Card Is Available for Pre-Order
              </span>
            </a>
            <a
              className="fp-press__card"
              href="https://finance.yahoo.com"
              target="_blank"
              rel="noreferrer"
            >
              <span className="fp-press__src">Yahoo Finance</span>
              <span className="fp-press__title">
                ChangeNOW: Focusing on Customers to Build a Better Crypto World
              </span>
            </a>
            <a
              className="fp-press__card"
              href="https://crypto.news"
              target="_blank"
              rel="noreferrer"
            >
              <span className="fp-press__src">Crypto News</span>
              <span className="fp-press__title">
                Exchange Cryptos and Receive Cashback with the New Feature
              </span>
            </a>
          </div>
          <a className="fp-press__more" href={`${SITE_URL}/press`}>
            Read more →
          </a>
        </div>
      </section>

      {/* ─── Team ─────────────────────────────────────────── */}
      <section className="fp-section fp-section--soft">
        <div className="fp-container">
          <h2 className="fp-section__title">Our team</h2>
          <div className="fp-team">
            {TEAM.map((m) => (
              <div className="fp-team__card" key={m.name}>
                <div className="fp-team__avatar" aria-hidden>
                  {m.name.charAt(0)}
                </div>
                <div className="fp-team__name">{m.name}</div>
                <div className="fp-team__role">{m.role}</div>
                <div className="fp-team__links">
                  <a href={m.tg} target="_blank" rel="noreferrer">Telegram</a>
                  <a href={m.ln} target="_blank" rel="noreferrer">LinkedIn</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────── */}
      <section className="fp-section" id="faq">
        <div className="fp-container">
          <h2 className="fp-section__title">FAQ</h2>
          <div className="fp-faq">
            {FAQ.map((chapter, ci) => (
              <div className="fp-faq__chapter" key={chapter.title}>
                <button
                  type="button"
                  className={`fp-faq__chapter-head ${openChapter === ci ? 'is-open' : ''}`}
                  onClick={() => setOpenChapter(openChapter === ci ? null : ci)}
                  aria-expanded={openChapter === ci}
                >
                  <span>{chapter.title}</span>
                  <span className="fp-faq__caret" aria-hidden>+</span>
                </button>
                {openChapter === ci && (
                  <ul className="fp-faq__list">
                    {chapter.items.map((item) => {
                      const key = `${ci}-${item.q}`;
                      const isOpen = openQuestion === key;
                      return (
                        <li
                          className={`fp-faq__item ${isOpen ? 'is-open' : ''}`}
                          key={item.q}
                        >
                          <button
                            type="button"
                            className="fp-faq__q"
                            onClick={() => toggleQuestion(key)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.q}</span>
                            <span className="fp-faq__caret" aria-hidden>
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>
                          {isOpen && <p className="fp-faq__a">{item.a}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ──────────────────────────────────────── */}
      <section className="fp-section fp-section--contact" ref={contactRef}>
        <div className="fp-container fp-contact">
          <div className="fp-contact__copy">
            <h2 className="fp-section__title">Contact us for assistance</h2>
            <p className="fp-section__sub">
              To get in touch with our team, please complete the form below
              — or book a call.
            </p>
            <div className="fp-contact__refs">
              <a href={SUPPORT.helpCenter} target="_blank" rel="noreferrer">
                Help center
              </a>
              <a href={LEARN.faq}>FAQ</a>
              <a href={`${SITE_URL}/contact`}>Contact</a>
            </div>
          </div>
          <form
            className="fp-form"
            onSubmit={(e) => {
              e.preventDefault();
              // Submit goes to the legacy support form via support@. Keep
              // the in-page handler so users get an immediate confirmation
              // chip instead of a navigation away.
              const form = e.currentTarget;
              const data = new FormData(form);
              const body = `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nCompany: ${data.get('company')}\n\n${data.get('message')}`;
              window.location.href = `mailto:support@changenow.io?subject=Partner%20inquiry&body=${encodeURIComponent(body)}`;
            }}
          >
            <label className="fp-field">
              <span>Name</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="fp-field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="fp-field">
              <span>Company</span>
              <input name="company" autoComplete="organization" />
            </label>
            <label className="fp-field fp-field--full">
              <span>How can we help?</span>
              <textarea name="message" rows={4} required />
            </label>
            <div className="fp-form__actions">
              <button type="submit" className="fp-btn fp-btn--primary">
                Send
              </button>
              <a
                href={BOOK_A_CALL}
                className="fp-btn fp-btn--ghost"
                target="_blank"
                rel="noreferrer"
              >
                Book a call
              </a>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
