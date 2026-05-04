import { ACCOUNT, BUSINESS, FAMILY, LEARN, PRODUCTS, SUPPORT } from '@/lib/links';

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

export type MegaMenuId = 'exchange' | 'grow' | 'transfer' | 'learn';

export const MEGA_MENU: Record<MegaMenuId, MegaConfig> = {
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

export const MM_BIZ_HIGHLIGHTS: Record<MegaMenuId, MegaHighlightItem[]> = {
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

export const NAV_ITEMS: { id: MegaMenuId; label: string }[] = [
  { id: 'exchange', label: 'Exchange' },
  { id: 'grow', label: 'Grow' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'learn', label: 'Learn' },
];

export const HEADER_AUTH_LINKS = {
  signup: ACCOUNT.signup,
  login: ACCOUNT.login,
};
