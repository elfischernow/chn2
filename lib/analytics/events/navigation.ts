// Header / footer / language-switcher clicks.

import { trackEvent } from '../track';

export const navigationEvents = {
  headerClick(label: string): void {
    trackEvent({ category: 'navigation', action: 'nav_header_click', label });
  },
  footerClick(label: string): void {
    trackEvent({ category: 'navigation', action: 'nav_footer_click', label });
  },
  languageChange(from: string, to: string): void {
    trackEvent({
      category: 'navigation',
      action: 'nav_language_change',
      label: `${from}->${to}`,
    });
  },
  mobileMenuOpen(): void {
    trackEvent({ category: 'navigation', action: 'nav_mobile_menu_open' });
  },
} as const;
