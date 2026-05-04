import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

export type QrCodeLink = string;

export interface TrackEventParams {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export interface IconProps {
  color?: string;
  className?: string;
}

export interface SocialLink {
  id: string;
  href: string;
  icon: string;
  alt: string;
}

export interface FooterProps {
  t: (key: string, defaultMessage?: string) => string;
  currentUrl: string;
  isAppleDevice?: boolean;
  isAndroidDevice?: boolean;
  apkAndroidUrl?: string;
  apkAndroidName?: string;
  qrCodeLink?: QrCodeLink;
  isDarkTheme?: boolean;
  currentLanguage?: string;
  languages?: string[];
  languagesNames?: Record<string, string>;
  trackEvent?: (event: TrackEventParams) => void;
}

export interface AnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  'data-track-outbound'?: string;
  'data-track-event'?: string;
}

export interface NavProps {
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  isNew?: boolean;
}

export type FooterVariant = 'mobile' | 'desktop';

export interface FooterListItemData {
  type?: 'nav' | 'anchor';
  href?: string;
  label?: string;
  liClassName?: string;
  anchorClassName?: string;
  iconAfterUrl?: string;
  isNew?: boolean;
  anchorProps?: AnchorProps;
  navProps?: NavProps;
  beforeIconUrl?: string;
  afterIconUrl?: string;
  mobileLiClassName?: string;
  mobileAnchorClassName?: string;
  mobileAnchorProps?: AnchorProps;
  mobileNavProps?: NavProps;
  mobileBeforeIconUrl?: string;
  mobileAfterIconUrl?: string;
  mobileIconAfterUrl?: string;
  desktopLiClassName?: string;
  desktopAnchorClassName?: string;
  desktopAnchorProps?: AnchorProps;
  desktopNavProps?: NavProps;
  desktopBeforeIconUrl?: string;
  desktopAfterIconUrl?: string;
  desktopIconAfterUrl?: string;
}

export interface FooterListItemProps {
  item: FooterListItemData;
  currentUrl: string;
  variant?: FooterVariant;
}

export interface FooterNavLinkProps {
  href: string;
  currentUrl: string;
  children: ReactNode;
  className?: string;
  isNew?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export interface FooterMobileNavigationProps {
  currentUrl: string;
  companySectionTitle: string;
  productSectionTitle: string;
  partnerSectionTitle: string;
  supportSectionTitle: string;
  legalSectionTitle: string;
  buyCryptoSectionTitle: string;
  exchangeSectionTitle: string;
  exchangePairsSectionTitle: string;
  companyLinks: FooterListItemData[];
  productLinks: FooterListItemData[];
  partnerLinks: FooterListItemData[];
  supportLinks: FooterListItemData[];
  legalLinks: FooterListItemData[];
  buyCryptoLinks: FooterListItemData[];
  exchangeLinks: FooterListItemData[];
  exchangePairsMobileGroups: FooterListItemData[][];
}

export interface FooterDesktopNavigationProps {
  currentUrl: string;
  companySectionTitle: string;
  productSectionTitle: string;
  partnerSectionTitle: string;
  supportSectionTitle: string;
  legalSectionTitle: string;
  buyCryptoSectionTitle: string;
  exchangeSectionTitle: string;
  exchangePairsSectionTitle: string;
  followUsTitle: string;
  copyrightText: string;
  copyrightDescription: string;
  companyLinks: FooterListItemData[];
  productLinks: FooterListItemData[];
  partnerLinks: FooterListItemData[];
  supportLinks: FooterListItemData[];
  legalLinks: FooterListItemData[];
  buyCryptoLinks: FooterListItemData[];
  exchangeLinks: FooterListItemData[];
  exchangePairsDesktopColumns: FooterListItemData[][];
  trustpilotLink?: string;
  socialLinksData: SocialLink[];
  isDarkTheme?: boolean;
  currentLanguage?: string;
  languages?: string[];
  languagesNames?: Record<string, string>;
  trackEvent?: (event: TrackEventParams) => void;
}

export interface FooterLogoSectionProps {
  localizationPrefix: string;
  mobileAppsTitle: string;
  isAppleDevice?: boolean;
  isAndroidDevice?: boolean;
  apkAndroidUrl?: string;
  apkAndroidName?: string;
  mobileLinks: {
    APP_STORE?: string;
    GOOGLE_PLAY?: string;
  };
  qrCodeLink?: QrCodeLink;
}

export interface FooterMobileAppsProps {
  isAppleDevice?: boolean;
  isAndroidDevice?: boolean;
  apkAndroidUrl?: string;
  apkAndroidName?: string;
  mobileLinks?: {
    APP_STORE?: string;
    GOOGLE_PLAY?: string;
  };
  qrCodeLink?: QrCodeLink;
}
