import 'server-only';

/**
 * Strapi shapes that drive coin/pair pages. The dynamic-zone blocks all
 * share `__component`, `id`, `is_enabled`; per-block fields layer on top.
 *
 * We deliberately keep these as `unknown`-leaning interfaces and let block
 * components narrow further at use-site. The admin team adds fields all
 * the time and we don't want a build-break every release; a missing field
 * just renders a placeholder.
 */

/** Common across every dynamic-zone block. */
export interface BlockBase {
  __component: string;
  id: number;
  is_enabled?: boolean | null;
  title?: string | null;
  description?: string | null;
}

export type Block = BlockBase & Record<string, unknown>;

/** Currency reference embedded inside a coin/pair page response. */
export interface UpstreamCurrencyRef {
  id?: number;
  ticker?: string;
  current_ticker?: string;
  name?: string;
  link?: string;
  network?: string;
  decimals?: string | number;
  is_fiat?: boolean;
  is_popular?: boolean;
  is_unpopular?: boolean | null;
  is_stable?: boolean;
  is_defi?: boolean;
  is_fixed_rate_enabled?: boolean;
  has_external_id?: boolean;
  external_id_name?: string | null;
  position?: number;
  icon?: { url?: string } | null;
  icon_png?: { url?: string } | null;
}

export interface CoinPageRaw {
  id: number;
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  description?: string | null;
  currency_from?: UpstreamCurrencyRef | null;
  locale?: string;
  blocks?: Block[];
  published_at?: string;
  updated_at?: string;
}

export interface PairPageRaw {
  id: number;
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  description?: string | null;
  currency_from?: UpstreamCurrencyRef | null;
  currency_to?: UpstreamCurrencyRef | null;
  locale?: string;
  blocks?: Block[];
  updated_at?: string;
}

/** Slimmed shape passed to React components. */
export interface CoinPage {
  id: number;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string;
  link: string;
  ticker: string;
  name: string;
  network: string;
  iconUrl: string | null;
  blocks: Block[];
  updatedAt: string;
}

/** Reference to the counter-currency on a pair page. */
export interface CounterCurrency {
  link: string;
  ticker: string;
  name: string;
  network: string;
  iconUrl: string | null;
}

export interface PairPage extends CoinPage {
  counter: CounterCurrency;
}
