import './register';

import type { Block, CoinPage, CounterCurrency } from '@/lib/api/content/types';
import type { TranslationDict } from '@/lib/i18n/createT';

import { resolveBlock } from './registry';

interface Props {
  blocks: Block[];
  page: CoinPage;
  dict: TranslationDict;
  hrefBase: string;
  pageType: 'coin' | 'pair';
  /** 1-based pagination state for paginated blocks (currencies-table). */
  tablePage?: number;
  /** TO-side currency on pair pages — undefined on coin pages. */
  counter?: CounterCurrency;
}

/**
 * Render every block in order. Unknown / unregistered components are
 * silently skipped so a new Strapi block-type doesn't crash the page —
 * the trade-off is a missing section instead of a broken render.
 */
export function BlockRenderer({
  blocks,
  page,
  dict,
  hrefBase,
  pageType,
  tablePage,
  counter,
}: Props) {
  return (
    <>
      {blocks.map((b) => {
        const Component = resolveBlock(b, pageType);
        if (!Component) return null;
        return (
          <Component
            key={`${b.__component}-${b.id}`}
            block={b}
            page={page}
            dict={dict}
            hrefBase={hrefBase}
            tablePage={tablePage}
            counter={counter}
          />
        );
      })}
    </>
  );
}
