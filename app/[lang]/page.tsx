import { Suspense } from 'react';

import { AccountTiers } from '@/components/homepage/AccountTiers';
import { AppsEverywhere } from '@/components/homepage/AppsEverywhere';
import { FAQ } from '@/components/homepage/FAQ';
import { FeaturesBlock } from '@/components/homepage/FeaturesBlock';
import { GlobalReach } from '@/components/homepage/GlobalReach';
import { Hero } from '@/components/homepage/Hero';
import { PressBlock } from '@/components/homepage/PressBlock';
import { PrivacySecurity } from '@/components/homepage/PrivacySecurity';
import { ProductsFamily } from '@/components/homepage/ProductsFamily';
import { RatesLiquidity } from '@/components/homepage/RatesLiquidity';
import { ReviewsPartners } from '@/components/homepage/ReviewsPartners';
import { TrackRecord } from '@/components/homepage/TrackRecord';

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
      <RatesLiquidity />
      <PrivacySecurity />
      <AppsEverywhere />
      <GlobalReach />
      <PressBlock />
      <ProductsFamily />
      <FAQ />
    </>
  );
}
