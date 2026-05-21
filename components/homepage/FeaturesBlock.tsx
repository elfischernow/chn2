import {
  getBtcCandles,
  getPredictionEvent,
  getRwaTickers,
} from '@/lib/api/featured-block';
import { getSession } from '@/lib/auth/server';

import { FeaturesBlockClient } from './FeaturesBlockClient';

/**
 * Server entry for the "One app. All your crypto. Every verb." section.
 *
 * All async data — prediction event, RWA tickers, BTC weekly candles — is
 * fetched on the server (`lib/api/featured-block.ts`) behind `unstable_cache`
 * so repeat visits within the cache window cost zero upstream calls and the
 * cards never wait on the main thread. The session check is the only thing
 * this layer does inline; everything else is the cached fetcher.
 *
 * `Promise.all` over the three data sources keeps the slowest one as the
 * total latency — they're independent, no waterfalls.
 */
export async function FeaturesBlock() {
  const [event, rwa, candles, session] = await Promise.all([
    getPredictionEvent(),
    getRwaTickers(),
    getBtcCandles(),
    getSession(),
  ]);
  return (
    <FeaturesBlockClient
      event={event}
      rwa={rwa}
      btcCandles={candles}
      isAuthed={session !== null}
    />
  );
}
