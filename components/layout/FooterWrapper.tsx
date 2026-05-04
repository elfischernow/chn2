'use client';

import './footer/styles/footer.css';
import './footer/styles/mobile-qr.css';
import './footer/styles/wide-language-dropdown.css';
import './footer-overrides.css';

import { Footer as KitFooter } from './footer/Footer';

import { createT, type TranslationDict } from '@/lib/i18n/createT';

interface FooterWrapperProps {
  dict: TranslationDict;
  currentUrl: string;
  isAppleDevice?: boolean;
  isAndroidDevice?: boolean;
  apkAndroidUrl?: string;
  apkAndroidName?: string;
  qrCodeLink?: string;
  currentLanguage?: string;
  languages?: string[];
  languagesNames?: Record<string, string>;
}

interface TrackEventParams {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

const trackEvent = (event: TrackEventParams) => {
  // Wire to analytics here when available. No-op in scaffold.
  if (typeof window !== 'undefined' && (window as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push(event);
  }
};

export function FooterWrapper({ dict, ...props }: FooterWrapperProps) {
  const t = createT(dict);
  // The kit's Footer expects a narrower `t(key, default?)` signature than ours.
  return (
    <KitFooter
      {...props}
      t={t as unknown as (key: string, defaultMessage?: string) => string}
      trackEvent={trackEvent}
    />
  );
}
