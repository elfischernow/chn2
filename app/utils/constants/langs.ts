import { Locale } from '@/lib/config';

export const LABELS: Record<Locale, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English' },
  ru: { flag: '🇷🇺', name: 'Русский' },
  fr: { flag: '🇫🇷', name: 'Français' },
  es: { flag: '🇪🇸', name: 'Español' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  it: { flag: '🇮🇹', name: 'Italiano' },
  pt: { flag: '🇵🇹', name: 'Português' },
  ar: { flag: '🇸🇦', name: 'العربية' },
  fa: { flag: '🇮🇷', name: 'فارسی' },
  ja: { flag: '🇯🇵', name: '日本語' },
  ko: { flag: '🇰🇷', name: '한국어' },
  th: { flag: '🇹🇭', name: 'ไทย' },
  tr: { flag: '🇹🇷', name: 'Türkçe' },
  vi: { flag: '🇻🇳', name: 'Tiếng Việt' },
  zh: { flag: '🇨🇳', name: '中文' },
  ind: { flag: '🇮🇩', name: 'Indonesia' },
};

export const LOCALES_ARRAY = Object.keys(LABELS) as (keyof typeof LABELS)[];

export const LOCALES_NAMES = Object.fromEntries(
  Object.entries(LABELS).map(([key, value]) => [key, value.name])
) as Record<Locale, string>;