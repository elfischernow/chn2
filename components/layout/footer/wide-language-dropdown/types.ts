import type { TrackEventParams } from '../types';

export interface WideLanguageDropdownProps {
  currentLanguage: string;
  languages: string[];
  languagesNames: Record<string, string>;
  currentPath: string;
  onLanguageChange?: (lang: string) => void;
  trackEvent: (event: TrackEventParams) => void;
}
