import { notFound } from 'next/navigation';

import { AUTH_MOCKS_ENABLED } from '@/lib/config';

import { DevAuthSwitcher } from './DevAuthSwitcher';

// Dev-only state-switcher page. Renders only when the mock flag is on; in
// any other build the route 404s so it never ships to production.
//
// `force-dynamic` keeps the flag check fresh — we never want a cached
// "this exists" response surviving a redeploy that flipped the flag off.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dev · Auth state switcher',
  robots: { index: false, follow: false },
};

export default function DevAuthPage() {
  if (!AUTH_MOCKS_ENABLED) notFound();
  return <DevAuthSwitcher />;
}
