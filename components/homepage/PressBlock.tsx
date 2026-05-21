import { CN_SITE_URL } from '@/lib/config';

import { VideoTrailer } from './VideoTrailer';

interface PressItem {
  id: number;
  logoLight: string;
  logoDark: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
  title: string;
  text: string;
  href: string;
}

/**
 * Press articles featured on the homepage. The first item is the featured
 * card — it sits next to the video trailer in the top row. The rest fill
 * the 3-column row below. Articles + logos are pulled from the legacy
 * SPA's `PRESS_ARTICLES_MAIN_PAGE` and `PRESS_ARTICLES_FOR_PARTNERS_PAGE`
 * constants. Light/dark variants follow the legacy file convention (the
 * original `*-black.svg` / `*-white.svg` map to our `-light` / `-dark`).
 */
const PRESS_ITEMS: readonly PressItem[] = [
  {
    id: 1,
    logoLight: '/images/press/yahoo-finance-light.svg',
    logoDark: '/images/press/yahoo-finance-dark.svg',
    imageWidth: 139,
    imageHeight: 24,
    alt: 'Yahoo Finance',
    title: 'ChangeNOW: Focusing on Customers to Build a Better Crypto World',
    text: 'Whatever your level of crypto knowledge and interest, ChangeNOW makes it easy to access a wide range of its crypto products and services.',
    href: 'https://finance.yahoo.com/news/changenow-focusing-customers-build-better-200000105.html',
  },
  {
    id: 2,
    logoLight: '/images/press/investing-light.svg',
    logoDark: '/images/press/investing-dark.svg',
    imageWidth: 139,
    imageHeight: 24,
    alt: 'Investing.com',
    title: 'ChangeNOW: What Moves the Crypto Exchange Industry?',
    text: 'In this exclusive interview our head of PR explains what forces push the crypto exchange platform industry forward.',
    href: 'https://www.investing.com/news/cryptocurrency-news/changenow-what-moves-the-crypto-exchange-industry-2625541',
  },
  {
    id: 3,
    logoLight: '/images/press/benzinga-light.svg',
    logoDark: '/images/press/benzinga-dark.svg',
    imageWidth: 139,
    imageHeight: 19,
    alt: 'Benzinga',
    title: 'ChangeNOW Review',
    text: 'Not only is ChangeNOW safe, it is fast and efficient. It is more secure than most centralized cryptocurrency exchanges since it does not keep your funds.',
    href: 'https://www.benzinga.com/money/changenow-review/',
  },
  {
    id: 4,
    logoLight: '/images/press/invezz-light.svg',
    logoDark: '/images/press/invezz-dark.svg',
    imageWidth: 91,
    imageHeight: 24,
    alt: 'Invezz',
    title: 'Review of ChangeNOW',
    text: 'ChangeNOW has created a benchmark in cryptocurrency swap service. This makes them one of the most convenient places to buy cryptos.',
    href: 'https://invezz.com/reviews/changenow/',
  },
];

/* eslint-disable @next/next/no-img-element --
 * Press logos are pre-sized SVG wordmarks; next/image's optimizer doesn't
 * help and the proxy adds a network hop. */
function PressCard({ item, featured = false }: { item: PressItem; featured?: boolean }) {
  return (
    <a
      className={`pr-card${featured ? ' pr-card-feature' : ''}`}
      href={item.href}
      target="_blank"
      rel="nofollow noreferrer noopener"
    >
      <span className="pr-card-logo">
        <img
          className="pr-card-logo-light"
          src={item.logoLight}
          alt={item.alt}
          width={item.imageWidth}
          height={item.imageHeight}
          loading="lazy"
          decoding="async"
        />
        <img
          className="pr-card-logo-dark"
          src={item.logoDark}
          alt=""
          width={item.imageWidth}
          height={item.imageHeight}
          loading="lazy"
          decoding="async"
          aria-hidden
        />
      </span>
      <p className="pr-card-title">{item.title}</p>
      <p className="pr-card-text">{item.text}</p>
      <span className="pr-card-cta" aria-hidden>Read article →</span>
    </a>
  );
}
/* eslint-enable @next/next/no-img-element */

export function PressBlock() {
  // Featured layout: trailer takes 2/3 of the row, the first article
  // sits in the remaining 1/3 and runs full row-height. The other three
  // articles fill the 3-column grid below.
  const [featured, ...rest] = PRESS_ITEMS;

  return (
    <section className="pr-section" aria-label="Press">
      <div className="pr-head">
        <span className="pr-eyebrow">Press about us</span>
        <h2>
          Stories <span className="tr-h2-light">written about us.</span>
        </h2>
      </div>

      <div className="pr-feature">
        <VideoTrailer
          src="/videos/ChangeNow_DOC_TRAILER_2302-1.mp4"
          poster="/images/poster.png"
        />
        {featured && <PressCard item={featured} featured />}
      </div>

      <div className="pr-cards">
        {rest.map((p) => (
          <PressCard key={p.id} item={p} />
        ))}
      </div>

      <div className="pr-foot">
        <a className="pr-foot-link" href={`${CN_SITE_URL}/press`}>
          More press coverage →
        </a>
      </div>
    </section>
  );
}
