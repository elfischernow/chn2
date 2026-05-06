// Server component. Renders the UTM helper + GA4 inline snippets into the
// document, gated on the same conditions legacy used:
//   1. NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
//   2. NEXT_PUBLIC_GOOGLE_DATA_STREAM_ID is set
//   3. Request is not from a Google bot (legacy isGoogleBot check)
//
// React 19 + Next 16 silently drop raw inline <script> tags rendered from
// React components — see the comment in app/[lang]/layout.tsx. We use
// next/script to ship them.

import Script from 'next/script';
import { headers } from 'next/headers';

import { buildGa4Snippet } from '@/lib/analytics/ga4-snippet';
import { utmSnippet } from '@/lib/analytics/utm-snippet';

const BOT_PATTERN = /Googlebot|AdsBot-Google|Mediapartners-Google|Storebot-Google/i;

export async function AnalyticsScripts(): Promise<React.ReactElement | null> {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_DATA_STREAM_ID;
  if (!enabled || !measurementId) return null;

  const ua = (await headers()).get('user-agent') ?? '';
  if (BOT_PATTERN.test(ua)) return null;

  return (
    <>
      <Script id="chn-utm-bootstrap" strategy="afterInteractive">
        {utmSnippet}
      </Script>
      <Script id="chn-ga4" strategy="afterInteractive">
        {buildGa4Snippet(measurementId)}
      </Script>
    </>
  );
}
