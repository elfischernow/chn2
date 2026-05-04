import { RawNavigationItem } from '@/components/layout/dropdowns/DropdownColumn';
import IosIcon from '@/components/layout/icons/IosIcon';
import PlayMarketIcon from '@/components/layout/icons/PlayMarketIcon';
import AndroidIcon from '@/components/layout/icons/AndroidIcon';
import QrIcon from '@/components/layout/icons/QrIcon';

interface HeaderLinks {
  support: RawNavigationItem[];
  aboutUs: RawNavigationItem[];
  forBusiness: RawNavigationItem[];
  forPersonalUse: RawNavigationItem[];
}

export const HEADER_NAVIGATION_LINKS: HeaderLinks = {
  support: [
    { type: 'nav', path: '/status-page', translationKey: 'HEADER.CHECK_EXCHANGE_STATUS'},
    { type: 'external', href: 'https://status.changenow.io/', translationKey: 'HEADER.STATUS_PAGE'},
    { type: 'external', href: 'https://support.changenow.io/hc/en-us/requests/new', translationKey: 'HEADER.CONTACT_SUPPORT'},
  ],
  aboutUs: [
    { type: 'nav', path: '/faq', translationKey: 'HEADER.FAQ' },
    { type: 'external', href: 'https://support.changenow.io/hc/en-us', translationKey: 'HEADER.HELP_CENTER'},
    { type: 'nav', path: '/how-it-works', translationKey: 'HEADER.HOW_IT_WORKS'},
  ],
  forBusiness: [
    {
      type: 'external',
      href: 'https://nowcustody.com/',
      translationKey: 'HEADER.NOW_CUSTODY',
      description: 'Crypto asset management',
    },
    {
      type: 'external',
      href: 'https://nowpayments.io/',
      translationKey: 'HEADER.PAYMENTS',
      description: 'Crypto payment gateway',
    },
    {
      type: 'external',
      href: 'https://nownodes.io/',
      translationKey: 'HEADER.NODES',
      description: 'Blockchain node provider',
    },
  ],
  forPersonalUse: [
    {
      type: 'external',
      href: 'https://walletnow.app',
      translationKey: 'HEADER.WALLET',
      description: 'Non-custodial crypto wallet',
    },
    {
      type: 'external',
      href: 'https://nowtracker.app/',
      translationKey: 'HEADER.TRACKER',
      description: 'Crypto portfolio tracking tool',
    },
    {
      type: 'nav',
      path: '/telegram-bot',
      translationKey: 'HEADER.TELEGRAM-BOT',
      description: 'Crypto exchange bot',
    },
  ]
};

export const HEADER_MOBILE_APPS_BUTTONS = [
  {
    id: 'ios',
    href: 'https://changenow.app.link/chn_Footer',
    icon: IosIcon
  },
  {
    id: 'playMarket',
    href: 'https://changenow.app.link/chn_Footer',
    icon: PlayMarketIcon
  },
  {
    id: 'android',
    icon: AndroidIcon,
    href: 'apkUrl',
  },
  {
    id: 'qr',
    href: 'qrCodeUrl',
    icon: QrIcon
  },
]