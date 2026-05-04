import { headers } from 'next/headers';

import { type Locale, LOCALE_NAMES, LOCALES } from '@/lib/config';
import type { TranslationDict } from '@/lib/i18n';

import { FooterWrapper } from './FooterWrapper';

const APK_ANDROID_URL = process.env.APK_ANDROID_URL ?? '';
const APK_ANDROID_NAME = process.env.APK_ANDROID_NAME ?? 'changenow.apk';
const QR_CODE_LINK = process.env.MOBILE_APPS_LINK ?? '';

interface FooterProps {
  dict: TranslationDict;
  lang: Locale;
}

export async function Footer({ dict, lang }: FooterProps) {
  const h = await headers();
  const userAgent = h.get('user-agent') || '';
  const currentUrl = h.get('x-url') || '';
  const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(userAgent);
  const isAndroidDevice = /Android/.test(userAgent);

  return (
    <FooterWrapper
      dict={dict}
      currentUrl={currentUrl}
      languages={[...LOCALES]}
      languagesNames={LOCALE_NAMES}
      isAppleDevice={isAppleDevice}
      isAndroidDevice={isAndroidDevice}
      apkAndroidUrl={APK_ANDROID_URL}
      apkAndroidName={APK_ANDROID_NAME}
      qrCodeLink={QR_CODE_LINK}
      currentLanguage={lang}
    />
  );
}
