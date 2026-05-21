import { BUSINESS, CN_SITE_URL, FAMILY, LEARN, PRODUCTS, SUPPORT } from '@/lib/links';

export type Tone = 'orange' | 'green' | 'violet' | 'blue';

export interface MegaHighlightItem {
  title: string;
  sub: string;
  href: string;
  badge?: string;
  tone: Tone;
}

export interface MegaListItem {
  label: string;
  href: string;
  subs?: { label: string; href: string }[];
  soon?: boolean;
}

export type MegaSection =
  | { title: string; kind: 'highlights'; items: MegaHighlightItem[] }
  | { title: string; kind: 'list'; items: MegaListItem[] };

export interface MegaConfig {
  cols: 2 | 3;
  sections: MegaSection[];
  foot: string;
  footHref: string;
}

export type PersonalMenuId = 'exchange' | 'grow' | 'transfer' | 'learn';
export type BusinessMenuId = 'earn' | 'manage' | 'build' | 'bizLearn';
export type MegaMenuId = PersonalMenuId | BusinessMenuId;

const FOR_PARTNERS = '/for-partners';

export const MEGA_MENU_PERSONAL: Record<PersonalMenuId, MegaConfig> = {
  exchange: {
    cols: 3,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Trade ideas, not just coins',
            sub: 'Prediction markets — bet on outcomes',
            badge: 'New',
            tone: 'orange',
            href: PRODUCTS.predictions,
          },
          {
            title: 'Swap in seconds',
            sub: '1000+ assets, 70+ chains',
            badge: 'Popular',
            tone: 'orange',
            href: PRODUCTS.swap,
          },
        ],
      },
      {
        title: 'Quick',
        kind: 'list',
        items: [
          {
            label: 'Buy with card / bank',
            href: PRODUCTS.buyCrypto,
            subs: [
              { label: 'Buy Bitcoin', href: `${PRODUCTS.buyCrypto}/btc` },
              { label: 'Buy Ethereum', href: `${PRODUCTS.buyCrypto}/eth` },
            ],
          },
          { label: 'Bridge any chain', href: PRODUCTS.bridge },
          { label: 'Convert & rebalance', href: PRODUCTS.exchange },
        ],
      },
      {
        title: 'Advanced trading',
        kind: 'list',
        items: [
          { label: 'Spot & limit', href: PRODUCTS.pro },
          { label: 'Charts & analytics', href: LEARN.marketData },
          { label: 'Perpetuals', href: PRODUCTS.perpetuals, soon: true },
        ],
      },
    ],
    foot: 'See all exchange tools',
    footHref: PRODUCTS.exchange,
  },
  grow: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Borrow against crypto',
            sub: 'Stablecoin loans, no credit check',
            tone: 'green',
            href: PRODUCTS.loans,
          },
          {
            title: 'The NOW token',
            sub: 'Stake for rewards and platform discounts',
            tone: 'green',
            href: FAMILY.nowToken,
          },
        ],
      },
      {
        title: 'Features',
        kind: 'list',
        items: [
          { label: 'Staking (up to 12%)', href: PRODUCTS.staking },
          { label: 'Tokenized stocks', href: PRODUCTS.rwa },
        ],
      },
    ],
    foot: 'See all earning options',
    footHref: PRODUCTS.staking,
  },
  transfer: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Get paid in crypto',
            sub: 'Payment link — share, receive any asset',
            tone: 'violet',
            href: FAMILY.nowPayments,
          },
          {
            title: 'Send privately',
            sub: 'No traces, no public ledger metadata',
            tone: 'violet',
            href: PRODUCTS.privateSwap,
          },
        ],
      },
      {
        title: 'Features',
        kind: 'list',
        items: [
          { label: 'Pay invoice', href: PRODUCTS.payInvoice },
          { label: 'NOW Card', href: PRODUCTS.card, soon: true },
          { label: 'P2P transfers', href: PRODUCTS.p2p, soon: true },
        ],
      },
    ],
    foot: 'See all transfer tools',
    footHref: PRODUCTS.privateSwap,
  },
  learn: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Crypto education hub',
            sub: 'Beginner guides, market deep-dives, tutorials',
            tone: 'blue',
            href: LEARN.blog,
          },
          {
            title: 'Explore 1000+ assets',
            sub: 'RWA, stables, DeFi, memes — sorted',
            tone: 'blue',
            href: LEARN.allCurrencies,
          },
        ],
      },
      {
        title: 'Features',
        kind: 'list',
        items: [
          { label: 'Market data', href: LEARN.marketData },
          { label: 'AI assistant', href: PRODUCTS.aiHub, soon: true },
          { label: 'Security & AML', href: LEARN.security },
          { label: 'Asset recovery', href: LEARN.assetRecovery },
          { label: 'Help & docs', href: SUPPORT.helpCenter },
        ],
      },
    ],
    foot: 'Visit learning hub',
    footHref: LEARN.blog,
  },
};

export const MEGA_MENU_BUSINESS: Record<BusinessMenuId, MegaConfig> = {
  earn: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Affiliate program',
            sub: 'Share a link, earn from every swap',
            tone: 'green',
            href: BUSINESS.affiliate,
          },
          {
            title: 'Referral links',
            sub: 'Customisable links for any audience',
            tone: 'green',
            href: BUSINESS.referral,
          },
        ],
      },
      {
        title: 'Programs',
        kind: 'list',
        items: [
          { label: 'Traffic monetisation', href: BUSINESS.affiliate },
          { label: 'NOW token discounts', href: FAMILY.nowToken },
          { label: 'Become a partner', href: FOR_PARTNERS },
        ],
      },
    ],
    foot: 'See partner programs',
    footHref: FOR_PARTNERS,
  },
  manage: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Warm wallet',
            sub: 'Treasury management for your project',
            tone: 'orange',
            href: `${CN_SITE_URL}/warm-wallets`,
          },
          {
            title: 'NOW Custody',
            sub: 'Receive, store and move crypto via one API',
            tone: 'orange',
            href: FAMILY.nowCustody,
          },
        ],
      },
      {
        title: 'Assets',
        kind: 'list',
        items: [
          { label: 'Asset listing', href: `${CN_SITE_URL}/asset-listing` },
          { label: 'Multichain bridge', href: PRODUCTS.bridge },
          { label: 'Market info API', href: `${CN_SITE_URL}/market-info-api` },
        ],
      },
    ],
    foot: 'See custody & treasury',
    footHref: FOR_PARTNERS,
  },
  build: {
    cols: 3,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'Exchange API',
            sub: 'Free key, 1500+ assets, fixed-rate flow',
            badge: 'Dev',
            tone: 'blue',
            href: BUSINESS.api,
          },
          {
            title: 'White-label exchange',
            sub: 'Your brand, our liquidity & rails',
            tone: 'blue',
            href: BUSINESS.whiteLabel,
          },
        ],
      },
      {
        title: 'Integrations',
        kind: 'list',
        items: [
          { label: 'Widget & button', href: BUSINESS.widget },
          { label: 'Telegram bot', href: `${CN_SITE_URL}/telegram-bot` },
          { label: 'Permanent swap address', href: `${CN_SITE_URL}/swap` },
        ],
      },
      {
        title: 'Ecosystem',
        kind: 'list',
        items: [
          { label: 'NowPayments', href: FAMILY.nowPayments },
          { label: 'NOWNodes', href: FAMILY.nowNodes },
          { label: 'NOW Custody', href: FAMILY.nowCustody },
        ],
      },
    ],
    foot: 'See developer tools',
    footHref: FOR_PARTNERS,
  },
  bizLearn: {
    cols: 2,
    sections: [
      {
        title: 'Highlights',
        kind: 'highlights',
        items: [
          {
            title: 'For partners',
            sub: 'Solutions overview, get a free API key',
            tone: 'violet',
            href: FOR_PARTNERS,
          },
          {
            title: 'Contact BD',
            sub: 'Book a call with the business team',
            tone: 'violet',
            href: BUSINESS.contactBd,
          },
        ],
      },
      {
        title: 'Resources',
        kind: 'list',
        items: [
          { label: 'API docs', href: BUSINESS.api },
          { label: 'Help center', href: SUPPORT.helpCenter },
          { label: 'Security & AML', href: LEARN.security },
          { label: 'Blog', href: LEARN.blog },
        ],
      },
    ],
    foot: 'Visit the partners hub',
    footHref: FOR_PARTNERS,
  },
};

// Flat union of both menu sets so `MegaMenuId` is a valid lookup key on
// the combined config. The Header component picks between the personal
// and business `NAV_ITEMS` list and then looks up the active id here.
export const MEGA_MENU: Record<MegaMenuId, MegaConfig> = {
  ...MEGA_MENU_PERSONAL,
  ...MEGA_MENU_BUSINESS,
};

// Legacy hook: in personal mode the user can flip the audience switch to
// business while still browsing the personal product nav — the highlights
// row swaps in to B2B-flavoured cards. Untouched by this work; kept so the
// personal-mode nav still re-skins for B2B viewers.
export const MM_BIZ_HIGHLIGHTS: Record<PersonalMenuId, MegaHighlightItem[]> = {
  exchange: [
    {
      title: 'API & widgets',
      sub: 'Embed swap in your product',
      badge: 'Dev',
      tone: 'orange',
      href: BUSINESS.api,
    },
    {
      title: 'White-label exchange',
      sub: 'Your brand, our liquidity',
      tone: 'orange',
      href: BUSINESS.whiteLabel,
    },
  ],
  grow: [
    {
      title: 'B2B token discounts',
      sub: 'Lower fees with NOW holdings',
      tone: 'green',
      href: FAMILY.nowToken,
    },
    {
      title: 'NOW token for partners',
      sub: 'Treasury & co-marketing programs',
      tone: 'green',
      href: BUSINESS.contactBd,
    },
  ],
  transfer: [
    {
      title: 'NowPayments',
      sub: 'Accept crypto in checkout',
      tone: 'violet',
      href: FAMILY.nowPayments,
    },
    {
      title: 'Mass payouts',
      sub: 'Batch payments via API',
      tone: 'violet',
      href: BUSINESS.api,
    },
  ],
  learn: [
    {
      title: 'Developer docs',
      sub: 'API reference, SDKs, sandbox',
      tone: 'blue',
      href: BUSINESS.api,
    },
    {
      title: 'B2B case studies',
      sub: 'How partners ship with us',
      tone: 'blue',
      href: BUSINESS.contactBd,
    },
  ],
};

export const NAV_ITEMS: { id: PersonalMenuId; label: string }[] = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'grow', label: 'Grow' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'learn', label: 'Learn' },
];

export const NAV_ITEMS_BIZ: { id: BusinessMenuId; label: string }[] = [
  { id: 'earn', label: 'Earn' },
  { id: 'manage', label: 'Manage' },
  { id: 'build', label: 'Build' },
  { id: 'bizLearn', label: 'Learn' },
];
