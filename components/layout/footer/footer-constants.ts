import type { FooterListItemData } from './types';

const tooltipNewIcon = '/images/cn-ui-kit/footer/tooltip-new.svg';
const foreignLinkIcon = '/images/cn-ui-kit/footer/foreign_link.svg';
const twitterIcon = '/images/cn-ui-kit/footer/social-icons/twitter-x.svg';
const telegramIcon = '/images/cn-ui-kit/footer/social-icons/telegram.svg';
const redditIcon = '/images/cn-ui-kit/footer/social-icons/reddit.svg';
const facebookIcon = '/images/cn-ui-kit/footer/social-icons/facebook.svg';
const youtubeIcon = '/images/cn-ui-kit/footer/social-icons/youtube.svg';

// Each FooterListItemConfig in the file extends FooterListItemData with the
// extra build-time fields (path / translationKey / strapiPath); the renderer
// hydrates them down into href + label before passing to the leaf components.
type FooterListItemConfig = FooterListItemData & {
  path?: string;
  translationKey?: string;
  translationDefault?: string;
  strapiPath?: string;
};

export const COMPANY_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/about', translationKey: 'FOOTER.ABOUT_US' },
  { type: 'nav', path: '/blog', translationKey: 'FOOTER.NEWS_AND_BLOGS' },
  { type: 'nav', path: '/press', translationKey: 'FOOTER.PRESS' },
  { type: 'nav', path: '/video', translationKey: 'FOOTER.VIDEO' },
  { type: 'nav', path: '/jobs', translationKey: 'FOOTER.JOBS' },
  { type: 'nav', path: '/reviews', translationKey: 'FOOTER.REVIEWS' },
];

export const PRODUCT_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/pro', translationKey: 'FOOTER.PREMIUM' },
  {
    type: 'nav',
    path: '/permanent-exchange',
    translationKey: 'FOOTER.PERMANENT_EXCHANGES',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  { type: 'nav', path: '/mobile-exchange', translationKey: 'FOOTER.MOBILE_EXCHANGE' },
  {
    type: 'anchor',
    href: 'https://walletnow.app/',
    translationKey: 'FOOTER.NOW_WALLET',
    liClassName: 'footer__navigation-list-item_link-icon',
    iconAfterUrl: foreignLinkIcon,
  },
  {
    type: 'anchor',
    href: 'https://nowtracker.app/',
    translationKey: 'FOOTER.NOW_TRACKER',
    liClassName: 'footer__navigation-list-item_link-icon',
    iconAfterUrl: foreignLinkIcon,
  },
  { type: 'nav', path: '/tokens', translationKey: 'FOOTER.NOW_TOKEN' },
  { type: 'nav', path: '/predictions', translationKey: 'FOOTER.PREDICTIONS' },
  { type: 'nav', path: '/private-transfers', translationKey: 'FOOTER.PRIVATE_TRANSFERS' },
  {
    type: 'nav',
    path: '/real-world-assets',
    translationKey: 'FOOTER.RWA',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  {
    type: 'nav',
    path: '/meme-coins',
    translationKey: 'FOOTER.MEME_COINS',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  {
    type: 'nav',
    path: '/defi-coins',
    translationKey: 'FOOTER.DEFI_COINS',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  {
    type: 'nav',
    path: '/swap',
    translationKey: 'FOOTER.CROSSCHAIN_SWAP',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  { type: 'nav', path: '/crypto-loan', translationKey: 'FOOTER.CRYPTO_LOAN' },
  {
    type: 'anchor',
    href: 'https://t.me/ChangeNOW_officialbot',
    translationKey: 'FOOTER.TELEGRAM_BOT',
  },
  { type: 'nav', path: '/lightning', translationKey: 'FOOTER.LIGHTNING' },
];

export const PARTNER_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/api', translationKey: 'FOOTER.DEVELOPMENT_API' },
  { type: 'nav', path: '/affiliate', translationKey: 'FOOTER.PARTNERS_PROFILE' },
  { type: 'nav', path: '/referral-links', translationKey: 'FOOTER.REFERRAL_PROGRAM' },
  { type: 'nav', path: '/program-affiliate', translationKey: 'FOOTER.AFFILIATE_PROGRAM' },
  { type: 'nav', path: '/widget', translationKey: 'FOOTER.WIDGETS_BUTTONS' },
  { type: 'nav', path: '/crypto-wallet', translationKey: 'FOOTER.WHITE_LABEL' },
  {
    type: 'nav',
    path: '/asset-listing',
    translationKey: 'FOOTER.LISTING',
    liClassName: 'footer__navigation-list-item_link-icon',
  },
  { type: 'nav', path: '/multichain-bridge', translationKey: 'FOOTER.MULTICHAIN_BRIDGE' },
  {
    type: 'anchor',
    href: 'https://nowpayments.io/',
    translationKey: 'FOOTER.NOW_PAYMENTS',
    liClassName: 'footer__navigation-list-item_link-icon',
    iconAfterUrl: foreignLinkIcon,
  },
  {
    type: 'anchor',
    href: 'https://nowcustody.com/',
    translationKey: 'FOOTER.NOW_CUSTODY',
    liClassName: 'footer__navigation-list-item_link-icon',
    iconAfterUrl: foreignLinkIcon,
  },
  {
    type: 'anchor',
    href: 'https://nownodes.io/',
    translationKey: 'FOOTER.NOW_NODES',
    liClassName: 'footer__navigation-list-item_link-icon',
    iconAfterUrl: foreignLinkIcon,
  },
];

export const SUPPORT_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/faq', translationKey: 'FOOTER.FAQ' },
  { type: 'nav', path: '/how-it-works', translationKey: 'FOOTER.HOW_IT_WORKS' },
  { type: 'nav', path: '/glossary', translationKey: 'FOOTER.GLOSSARY' },
  { type: 'nav', path: '/contact', translationKey: 'FOOTER.CONTACT_US' },
  {
    type: 'anchor',
    href: 'https://support.changenow.io/hc/en-us',
    translationKey: 'FOOTER.HELP_CENTER',
    anchorProps: { 'data-track-outbound': 'https://support.changenow.io/hc/en-us' },
  },
  // Status lives on its own subdomain (statuspage.io-style external host),
  // not under the marketing site path. Prod links here verbatim too.
  {
    type: 'anchor',
    href: 'https://status.changenow.io/',
    translationKey: 'FOOTER.STATUS_PAGE',
    anchorProps: { 'data-track-outbound': 'https://status.changenow.io/' },
  },
  {
    type: 'nav',
    path: '/btc-halving',
    translationKey: 'FOOTER.BTC_HALVING',
    translationDefault: 'Bitcoin Halving',
  },
];

export const LEGAL_LINKS: FooterListItemConfig[] = [
  { type: 'anchor', strapiPath: 'FOOTER.KYC_AML.LINK', translationKey: 'FOOTER.KYC_AML' },
  { type: 'nav', path: '/terms-of-use', translationKey: 'FOOTER.TERMS_OF_USE' },
  { type: 'nav', path: '/privacy-policy', translationKey: 'FOOTER.PRIVACY_POLICY' },
  { type: 'nav', path: '/risk-disclosure-statement', translationKey: 'FOOTER.RISK_DISCLOSURE' },
  { type: 'nav', path: '/hard-fork-policy', translationKey: 'FOOTER.HARD_FORK_POLICY' },
  {
    type: 'nav',
    path: '/law-enforcement-request-guidelines',
    translationKey: 'FOOTER.LAW_ENFORCEMENT_REQUEST',
  },
  { type: 'nav', path: '/asset-recovering', translationKey: 'FOOTER.BUSINESS_ETHICS' },
];

export const BUY_CRYPTO_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/buy/bitcoin', translationKey: 'FOOTER.COINS.BUY1' },
  { type: 'nav', path: '/buy/ethereum', translationKey: 'FOOTER.COINS.BUY2' },
  { type: 'nav', path: '/buy/tether-erc20', translationKey: 'FOOTER.COINS.BUY3' },
  {
    type: 'nav',
    path: '/buy/binance-coin-smart-chain',
    translationKey: 'FOOTER.COINS.BUY4',
  },
  { type: 'nav', path: '/buy/usd-coin', translationKey: 'FOOTER.COINS.BUY5' },
  { type: 'nav', path: '/buy/ripple', translationKey: 'FOOTER.COINS.BUY6' },
  { type: 'nav', path: '/buy/dogecoin', translationKey: 'FOOTER.COINS.BUY7' },
  { type: 'nav', path: '/buy/litecoin', translationKey: 'FOOTER.COINS.BUY8' },
  { type: 'nav', path: '/buy/monero', translationKey: 'FOOTER.COINS.BUY9' },
  { type: 'nav', path: '/buy/tron', translationKey: 'FOOTER.COINS.BUY10' },
  { type: 'nav', path: '/buy/ton', translationKey: 'FOOTER.COINS.BUY11' },
  { type: 'nav', path: '/buy/solana', translationKey: 'FOOTER.COINS.BUY12' },
  { type: 'nav', path: '/buy/official-trump', translationKey: 'FOOTER.COINS.BUY13' },
  { type: 'nav', path: '/buy', translationKey: 'FOOTER.ALL_CURRENCIES_TO_BUY' },
  {
    type: 'nav',
    path: '/sell',
    translationKey: 'FOOTER.ALL_CURRENCIES_TO_SELL',
    mobileLiClassName: 'new-badge__circle',
    desktopLiClassName: 'new-badge__circle',
    desktopBeforeIconUrl: tooltipNewIcon,
  },
  { type: 'nav', path: '/all-currencies-buy', translationKey: 'FOOTER.BUY_SITEMAP' },
];

export const EXCHANGE_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/currencies/bitcoin', translationKey: 'FOOTER.COINS.EXCHANGE1' },
  { type: 'nav', path: '/currencies/ethereum', translationKey: 'FOOTER.COINS.EXCHANGE2' },
  { type: 'nav', path: '/currencies/tether-erc20', translationKey: 'FOOTER.COINS.EXCHANGE3' },
  { type: 'nav', path: '/currencies/tether-trc20', translationKey: 'FOOTER.COINS.EXCHANGE4' },
  { type: 'nav', path: '/currencies/usd-coin', translationKey: 'FOOTER.COINS.EXCHANGE5' },
  { type: 'nav', path: '/currencies/monero', translationKey: 'FOOTER.COINS.EXCHANGE6' },
  { type: 'nav', path: '/currencies/cardano', translationKey: 'FOOTER.COINS.EXCHANGE7' },
  { type: 'nav', path: '/currencies/dogecoin', translationKey: 'FOOTER.COINS.EXCHANGE8' },
  { type: 'nav', path: '/currencies/polygon-matic', translationKey: 'FOOTER.COINS.EXCHANGE9' },
  { type: 'nav', path: '/currencies/ton', translationKey: 'FOOTER.COINS.EXCHANGE10' },
  { type: 'nav', path: '/currencies/ripple', translationKey: 'FOOTER.COINS.EXCHANGE11' },
  { type: 'nav', path: '/currencies/shiba-inu', translationKey: 'FOOTER.COINS.EXCHANGE12' },
  {
    type: 'nav',
    path: '/currencies/official-trump',
    translationKey: 'FOOTER.COINS.EXCHANGE13',
  },
  { type: 'nav', path: '/currencies', translationKey: 'FOOTER.ALL_CURRENCIES' },
  {
    type: 'nav',
    path: '/all-currencies-exchange',
    translationKey: 'FOOTER.SITEMAP_EXCHANGE',
  },
];

export const EXCHANGE_PAIR_LINKS: FooterListItemConfig[] = [
  { type: 'nav', path: '/currencies/bitcoin/monero', translationKey: 'FOOTER.COINS.PAIR1' },
  {
    type: 'nav',
    path: '/currencies/bitcoin/tether-erc20',
    translationKey: 'FOOTER.COINS.PAIR2',
  },
  {
    type: 'nav',
    path: '/currencies/tether-erc20/monero',
    translationKey: 'FOOTER.COINS.PAIR3',
  },
  { type: 'nav', path: '/currencies/ethereum/monero', translationKey: 'FOOTER.COINS.PAIR4' },
  { type: 'nav', path: '/currencies/ethereum/bitcoin', translationKey: 'FOOTER.COINS.PAIR5' },
  { type: 'nav', path: '/currencies/monero/bitcoin', translationKey: 'FOOTER.COINS.PAIR6' },
  {
    type: 'nav',
    path: '/currencies/binance-coin-smart-chain/ethereum',
    translationKey: 'FOOTER.COINS.PAIR7',
  },
  { type: 'nav', path: '/currencies/bitcoin/ethereum', translationKey: 'FOOTER.COINS.PAIR8' },
  { type: 'nav', path: '/currencies/solana/bitcoin', translationKey: 'FOOTER.COINS.PAIR9' },
  {
    type: 'nav',
    path: '/currencies/tether-erc20/bitcoin',
    translationKey: 'FOOTER.COINS.PAIR10',
  },
  { type: 'nav', path: '/currencies/tether-trc20/tron', translationKey: 'FOOTER.COINS.PAIR11' },
  { type: 'nav', path: '/currencies/litecoin/monero', translationKey: 'FOOTER.COINS.PAIR12' },
  {
    type: 'nav',
    path: '/currencies/ethereum/binance-coin-smart-chain',
    translationKey: 'FOOTER.COINS.PAIR13',
  },
  {
    type: 'nav',
    path: '/currencies/binance-coin-smart-chain/bitcoin',
    translationKey: 'FOOTER.COINS.PAIR14',
  },
  { type: 'nav', path: '/currencies/monero/litecoin', translationKey: 'FOOTER.COINS.PAIR15' },
  { type: 'nav', path: '/currencies/monero/ethereum', translationKey: 'FOOTER.COINS.PAIR16' },
  { type: 'nav', path: '/currencies/litecoin/bitcoin', translationKey: 'FOOTER.COINS.PAIR17' },
  {
    type: 'nav',
    path: '/currencies/bitcoin/binance-coin-smart-chain',
    translationKey: 'FOOTER.COINS.PAIR18',
  },
  {
    type: 'nav',
    path: '/currencies/monero/tether-erc20',
    translationKey: 'FOOTER.COINS.PAIR19',
  },
  {
    type: 'nav',
    path: '/currencies/binance-coin-smart-chain/tether-erc20',
    translationKey: 'FOOTER.COINS.PAIR20',
  },
  { type: 'nav', path: '/currencies/solana/ethereum', translationKey: 'FOOTER.COINS.PAIR21' },
  {
    type: 'nav',
    path: '/currencies/tether-erc20/ethereum',
    translationKey: 'FOOTER.COINS.PAIR22',
  },
  {
    type: 'nav',
    path: '/currencies/tether-erc20/binance-coin-smart-chain',
    translationKey: 'FOOTER.COINS.PAIR23',
  },
  { type: 'nav', path: '/currencies/bitcoin/litecoin', translationKey: 'FOOTER.COINS.PAIR24' },
  {
    type: 'nav',
    path: '/currencies/ethereum/tether-erc20',
    translationKey: 'FOOTER.COINS.PAIR25',
  },
  { type: 'nav', path: '/currencies/bitcoin/tron', translationKey: 'FOOTER.COINS.PAIR26' },
  {
    type: 'nav',
    path: '/currencies/bitcoin/now-token',
    translationKey: 'FOOTER.COINS.PAIR27',
  },
  { type: 'nav', path: '/currencies/ethereum/tron', translationKey: 'FOOTER.COINS.PAIR28' },
  {
    type: 'nav',
    path: '/currencies/polygon-matic/bitcoin',
    translationKey: 'FOOTER.COINS.PAIR29',
  },
  { type: 'nav', path: '/currencies/bitcoin/solana', translationKey: 'FOOTER.COINS.PAIR30' },
];

export const FOOTER_MOBILE_APPS_LINKS = {
  APP_STORE: 'https://changenow.app.link/chn_Footer',
  GOOGLE_PLAY: 'https://changenow.app.link/chn_Footer',
};

export const FOOTER_NAVIGATION_LINKS = {
  company: COMPANY_LINKS,
  products: PRODUCT_LINKS,
  partners: PARTNER_LINKS,
  support: SUPPORT_LINKS,
  legal: LEGAL_LINKS,
  buyCrypto: BUY_CRYPTO_LINKS,
  exchange: EXCHANGE_LINKS,
  exchangePairs: EXCHANGE_PAIR_LINKS,
};

export const FOOTER_SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/ChangeNOW.io/',
  twitter: 'https://x.com/ChangeNOW_io',
  telegram: 'https://t.me/changeNOW_chat',
  instagram: 'https://www.instagram.com/changenow_io/',
  trustpilot: 'https://www.trustpilot.com/review/changenow.io',
  benzinga: 'https://www.benzinga.com/money/changenow-review/',
  reddit: 'https://www.reddit.com/r/ChangeNOW_io/',
  medium: 'https://changenow-io.medium.com/',
  youtube: 'https://www.youtube.com/ChangeNOW',
  bitcointalk: 'https://bitcointalk.org/index.php?action=profile;u=1307188',
  linkedin: 'https://www.linkedin.com/company/changenow-io/',
  coinMarketCap: 'https://coinmarketcap.com/exchanges/changenow/',
  publish0x: 'https://www.publish0x.com/@ChangeNOW',
};

export const FOOTER_SOCIAL_LINKS_DATA = [
  { id: 'twitter', href: FOOTER_SOCIAL_LINKS.twitter, icon: twitterIcon, alt: 'twitter' },
  { id: 'telegram', href: FOOTER_SOCIAL_LINKS.telegram, icon: telegramIcon, alt: 'telegram' },
  { id: 'reddit', href: FOOTER_SOCIAL_LINKS.reddit, icon: redditIcon, alt: 'reddit' },
  { id: 'facebook', href: FOOTER_SOCIAL_LINKS.facebook, icon: facebookIcon, alt: 'facebook' },
  { id: 'youtube', href: FOOTER_SOCIAL_LINKS.youtube, icon: youtubeIcon, alt: 'youtube' },
];
