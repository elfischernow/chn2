import type { Block, CoinPage, CounterCurrency, PairPage } from '@/lib/api/content/types';
import type { TranslationDict } from '@/lib/i18n/createT';

/**
 * Shared shape for every block component. The `block` is the raw Strapi
 * payload (each block knows its own type via `__component`); `page` and
 * `dict` are the surrounding context.
 *
 * `page` is always the FROM-side of a pair (or the standalone coin), so
 * blocks that don't care about pairs treat it identically. Pair-aware
 * blocks read `counter`.
 */
export interface BlockProps {
  block: Block;
  page: CoinPage;
  dict: TranslationDict;
  /** URL prefix for hrefs into other coin/pair pages — '' for default locale. */
  hrefBase: string;
  /**
   * 1-based page number for paginated blocks. Currently only `currencies-table`
   * uses this — passed through `/currencies/[coin]/page/[N]` and
   * `/currencies/[coin]/[coinTo]/page/[N]`.
   */
  tablePage?: number;
  /** Set on pair pages — the TO-side currency. Undefined on coin pages. */
  counter?: CounterCurrency;
}

export type PairBlockProps = BlockProps & { page: PairPage; counter: CounterCurrency };
