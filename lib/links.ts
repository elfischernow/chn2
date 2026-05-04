// Single source of truth for production URLs we link out to. Kept here so
// changing a domain or adding a UTM lands in one place.
//
// `SITE_URL` is the legacy site root (the host that owns /exchange,
// /currencies, /buy, etc.). It comes from `lib/config` so a stage build
// can point at e.g. `https://bento.capital` via the `SITE_URL` env var
// without touching this file. Re-exported for callers that already import
// it from `@/lib/links`.
import { SITE_URL } from '@/lib/config';

export { SITE_URL };

export const ACCOUNT = {
  login: `${SITE_URL}/account/login`,
  signup: `${SITE_URL}/account/login?form=registration`,
};

export const SUPPORT = {
  helpCenter: 'https://support.changenow.io/hc/en-us',
  contact: 'https://support.changenow.io/hc/en-us/requests/new',
  status: 'https://status.changenow.io/',
};

export const REVIEWS = {
  trustpilot: 'https://www.trustpilot.com/review/changenow.io',
  /** Internal aggregate page that hosts all reviews (Trustpilot + community + partner). */
  all: `${SITE_URL}/reviews`,
};

export const APPS = {
  ios: 'https://changenow.app.link/chn_Header',
  android: 'https://changenow.app.link/chn_Header',
  telegramBot: `${SITE_URL}/telegram-bot`,
  /** Telegram mini-app — `/tg-app` legacy handler. The /extension path was a 404. */
  extension: `${SITE_URL}/tg-app`,
};

// All paths cross-checked against the legacy SPA's routes.js + handlers
// directory + cn-ui-kit footer URLs. Marketing-only "soon" features
// (perpetuals, card, p2p, ai-hub) route to `/pro` until the actual page
// ships — a 404 is worse than a soft landing on the upgrade page.
export const PRODUCTS = {
  exchange: `${SITE_URL}/exchange`,
  /** Legacy `buy` handler. The /buy-crypto path that used to be here is a 404. */
  buyCrypto: `${SITE_URL}/buy`,
  pro: `${SITE_URL}/pro`,
  predictions: `${SITE_URL}/predictions`,
  /** Legacy `CRYPTO_LOAN` route — the /loans path is a 404. */
  loans: `${SITE_URL}/crypto-loan`,
  /** Legacy `NOW_STAKING` route. Top-level /staking is a 404. */
  staking: `${SITE_URL}/tokens/now-staking`,
  /** No legacy route for cards yet — soft-land on /pro. */
  card: `${SITE_URL}/pro`,
  /** Legacy `PRIVATE_TRANSFERS` route. /private-trade is a 404. */
  privateSwap: `${SITE_URL}/private-transfers`,
  /** Legacy `MULTI_CHAIN_BRIDGE` route. /bridge is a 404. */
  bridge: `${SITE_URL}/multichain-bridge`,
  /** Legacy `SWAPS` — the partner-branded bridge integration. */
  swap: `${SITE_URL}/swap`,
  /** No legacy perpetuals page yet — soft-land on /pro. */
  perpetuals: `${SITE_URL}/pro`,
  /** Legacy `real-world-assets` handler. /tokenized-stocks is a 404. */
  rwa: `${SITE_URL}/real-world-assets`,
  /** No legacy gift-cards page — soft-land on /buy (closest in spirit). */
  giftCards: `${SITE_URL}/buy`,
  /** Travel partner uses /swap/trvl. /travel alone is a 404. */
  travel: `${SITE_URL}/swap/trvl`,
  /** Legacy `pay` handler (root, not the `/pay/:paymentId` deep link). */
  payInvoice: `${SITE_URL}/pay`,
  /** No legacy P2P page yet — soft-land on /pro. */
  p2p: `${SITE_URL}/pro`,
  /** No legacy AI hub page yet — soft-land on /pro. */
  aiHub: `${SITE_URL}/pro`,
  mcp: 'https://github.com/changenow/mcp',
};

export const FAMILY = {
  nowPayments: 'https://nowpayments.io/',
  nowWallet: 'https://walletnow.app',
  nowTracker: 'https://nowtracker.app/',
  nowCustody: 'https://nowcustody.com/',
  nowNodes: 'https://nownodes.io/',
  /** Legacy `tokens` handler at the root — the NOW token page. /now-token is a 404. */
  nowToken: `${SITE_URL}/tokens`,
  nowBlog: `${SITE_URL}/blog`,
  nowPro: `${SITE_URL}/pro`,
};

export const LEARN = {
  blog: `${SITE_URL}/blog`,
  /** Legacy currencies table doubles as the prices/charts page. /cryptocurrency-prices is a 404. */
  marketData: `${SITE_URL}/currencies`,
  faq: `${SITE_URL}/faq`,
  howItWorks: `${SITE_URL}/how-it-works`,
  /** Legacy `legal-and-security` handler. /aml-kyc is a 404. */
  security: `${SITE_URL}/legal-and-security`,
  /** Legacy `asset-recovering` handler — note the *-ing ending. /asset-recovery is a 404. */
  assetRecovery: `${SITE_URL}/asset-recovering`,
  allCurrencies: `${SITE_URL}/currencies`,
};

export const BUSINESS = {
  contactBd: `${SITE_URL}/contact`,
  api: `${SITE_URL}/api`,
  widget: `${SITE_URL}/widget`,
  whiteLabel: `${SITE_URL}/your-exchange`,
  /** Legacy `AFFILIATE_PROGRAM_PAGE` route. /affiliate-program is a 404. */
  affiliate: `${SITE_URL}/program-affiliate`,
  /** Legacy `REFERRAL_LINKS` route. /referral-program is a 404. */
  referral: `${SITE_URL}/referral-links`,
};
