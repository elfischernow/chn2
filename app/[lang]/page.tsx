import { Suspense } from 'react';

import { AccountTiers } from '@/components/homepage/AccountTiers';
import { AppsEverywhere } from '@/components/homepage/AppsEverywhere';
import { FAQ } from '@/components/homepage/FAQ';
import { FeaturesBlock } from '@/components/homepage/FeaturesBlock';
import { GlobalReach } from '@/components/homepage/GlobalReach';
import { Hero } from '@/components/homepage/Hero';
import { PressBlock } from '@/components/homepage/PressBlock';
import { OneBalance } from '@/components/homepage/OneBalance';
import { ProductsFamily } from '@/components/homepage/ProductsFamily';
import { RatesLiquidity } from '@/components/homepage/RatesLiquidity';
import { ReviewsPartners } from '@/components/homepage/ReviewsPartners';
import { TrackRecord } from '@/components/homepage/TrackRecord';
import { getCurrencies } from '@/lib/api/currencies';

// Async slot — fetches the catalog the Mobile tab needs to render a real
// calculator inside the iPhone frame (the visual is no longer a static
// screenshot). Reuses the same `getCurrencies()` call the Hero / OneBalance
// blocks already trigger; Next dedupes server-side fetches within the same
// request so this is free.
async function AppsEverywhereSlot() {
  const currencies = await getCurrencies();
  return <AppsEverywhere currencies={currencies} />;
}

// Live pieces (rates) revalidate every minute — same cadence as the blog's
// `CACHE_SHORT`. Must be a literal: route segment configs are statically analyzed.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturesBlock />
      <TrackRecord />
      <Suspense fallback={null}>
        <ReviewsPartners />
      </Suspense>
      <AccountTiers />
      <Suspense fallback={<div style={{ minHeight: 600 }} />}>
        <RatesLiquidity />
      </Suspense>
      <Suspense fallback={<div style={{ minHeight: 600 }} />}>
        <OneBalance />
      </Suspense>
      <Suspense fallback={<div style={{ minHeight: 600 }} />}>
        <AppsEverywhereSlot />
      </Suspense>
      <GlobalReach />
      <PressBlock />
      <ProductsFamily />
      <FAQ />
    </>
  );
}
