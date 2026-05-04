import { FooterDesktopNavigation } from './components/footer-desktop-navigation';
import { FooterLogoSection } from './components/footer-logo-section';
import { FooterMobileNavigation } from './components/footer-mobile-navigation';
import { fillString } from './fill-string';
import {
  FOOTER_MOBILE_APPS_LINKS,
  FOOTER_NAVIGATION_LINKS,
  FOOTER_SOCIAL_LINKS,
  FOOTER_SOCIAL_LINKS_DATA,
} from './footer-constants';
import type { FooterListItemData, FooterProps } from './types';

// FooterListItemConfig extends the leaf-level FooterListItemData with the
// build-time fields (path/translationKey/strapiPath) the constants module uses.
// Hydration in `hydrateLinkItem` resolves them down to href + label so the
// leaf <FooterListItem> never sees these extras.
type FooterListItemConfig = FooterListItemData & {
  path?: string;
  translationKey?: string;
  translationDefault?: string;
  strapiPath?: string;
};

export const Footer = (props: FooterProps) => {
  const {
    t,
    currentUrl,
    isAppleDevice,
    isAndroidDevice,
    apkAndroidUrl,
    apkAndroidName,
    qrCodeLink,
    isDarkTheme,
    currentLanguage,
    languages,
    languagesNames,
    trackEvent,
  } = props;

  const localizationPrefix = t('PREFIX') || '';
  const mobileAppsTitle = t('FOOTER.TRY');
  const companySectionTitle = t('FOOTER.COMPANY');
  const productSectionTitle = t('FOOTER.PRODUCTS');
  const partnerSectionTitle = t('FOOTER.FOR_PARTNERS');
  const supportSectionTitle = t('FOOTER.SUPPORT');
  const legalSectionTitle = t('FOOTER.LEGAL');
  const buyCryptoSectionTitle = t('FOOTER.BUY_CRYPTO');
  const exchangeSectionTitle = t('FOOTER.EXCHANGE');
  const exchangePairsSectionTitle = t('FOOTER.EXCHANGE_PAIRS');
  const currentYear = new Date().getFullYear();
  const copyrightText = fillString(t('FOOTER.COPYRIGHT_WITH_YEAR'), { YEAR: currentYear });
  const copyrightDescription = t('FOOTER.COPYRIGHT.DESCRIPTION');
  const followUsTitle = t('FOOTER.FOLLOW_US');

  const resolveHref = (item: FooterListItemConfig): string => {
    if (item.strapiPath) {
      const link = t(item.strapiPath);
      return `${localizationPrefix}${link}`;
    }
    if (item.type === 'nav' && item.path) {
      return `${localizationPrefix}${item.path}`;
    }
    if (item.href) return item.href;
    return '#';
  };

  const resolveLabel = (item: FooterListItemConfig): string => {
    if (!item.translationKey) return item.label || '';
    return t(item.translationKey, item.translationDefault);
  };

  const hydrateLinkItem = (item: FooterListItemConfig): FooterListItemData => ({
    ...item,
    href: resolveHref(item),
    label: resolveLabel(item),
  });

  const hydrateLinks = (items: FooterListItemConfig[] = []): FooterListItemData[] =>
    items.map(hydrateLinkItem);

  const {
    company: companyLinksConfig = [],
    products: productLinksConfig = [],
    partners: partnerLinksConfig = [],
    support: supportLinksConfig = [],
    legal: legalLinksConfig = [],
    buyCrypto: buyCryptoLinksConfig = [],
    exchange: exchangeLinksConfig = [],
    exchangePairs: exchangePairsConfig = [],
  } = FOOTER_NAVIGATION_LINKS;

  const companyLinks = hydrateLinks(companyLinksConfig);
  const productLinks = hydrateLinks(productLinksConfig);
  const partnerLinks = hydrateLinks(partnerLinksConfig);
  const supportLinks = hydrateLinks(supportLinksConfig);
  const legalLinks = hydrateLinks(legalLinksConfig);
  const buyCryptoLinks = hydrateLinks(buyCryptoLinksConfig);
  const exchangeLinks = hydrateLinks(exchangeLinksConfig);
  const exchangePairsLinks = hydrateLinks(exchangePairsConfig);
  const exchangePairsDesktopColumns = [
    exchangePairsLinks.slice(0, 10),
    exchangePairsLinks.slice(10, 20),
    exchangePairsLinks.slice(20, 30),
  ];
  const exchangePairsMobileGroups = [
    exchangePairsLinks.slice(0, 15),
    exchangePairsLinks.slice(15, 30),
  ];

  return (
    <div className="footer">
      <div className="container">
        <FooterLogoSection
          localizationPrefix={localizationPrefix}
          mobileAppsTitle={mobileAppsTitle}
          isAppleDevice={isAppleDevice}
          isAndroidDevice={isAndroidDevice}
          apkAndroidUrl={apkAndroidUrl}
          apkAndroidName={apkAndroidName}
          mobileLinks={FOOTER_MOBILE_APPS_LINKS}
          qrCodeLink={qrCodeLink}
        />
        <div className="row">
          <nav className="footer__navigation" role="navigation">
            <FooterMobileNavigation
              currentUrl={currentUrl}
              companySectionTitle={companySectionTitle}
              productSectionTitle={productSectionTitle}
              partnerSectionTitle={partnerSectionTitle}
              supportSectionTitle={supportSectionTitle}
              legalSectionTitle={legalSectionTitle}
              buyCryptoSectionTitle={buyCryptoSectionTitle}
              exchangeSectionTitle={exchangeSectionTitle}
              exchangePairsSectionTitle={exchangePairsSectionTitle}
              companyLinks={companyLinks}
              productLinks={productLinks}
              partnerLinks={partnerLinks}
              supportLinks={supportLinks}
              legalLinks={legalLinks}
              buyCryptoLinks={buyCryptoLinks}
              exchangeLinks={exchangeLinks}
              exchangePairsMobileGroups={exchangePairsMobileGroups}
            />
          </nav>
          <FooterDesktopNavigation
            currentUrl={currentUrl}
            companySectionTitle={companySectionTitle}
            productSectionTitle={productSectionTitle}
            partnerSectionTitle={partnerSectionTitle}
            supportSectionTitle={supportSectionTitle}
            legalSectionTitle={legalSectionTitle}
            buyCryptoSectionTitle={buyCryptoSectionTitle}
            exchangeSectionTitle={exchangeSectionTitle}
            exchangePairsSectionTitle={exchangePairsSectionTitle}
            followUsTitle={followUsTitle}
            copyrightText={copyrightText}
            copyrightDescription={copyrightDescription}
            companyLinks={companyLinks}
            productLinks={productLinks}
            partnerLinks={partnerLinks}
            supportLinks={supportLinks}
            legalLinks={legalLinks}
            buyCryptoLinks={buyCryptoLinks}
            exchangeLinks={exchangeLinks}
            exchangePairsDesktopColumns={exchangePairsDesktopColumns}
            trustpilotLink={FOOTER_SOCIAL_LINKS.trustpilot}
            socialLinksData={FOOTER_SOCIAL_LINKS_DATA}
            isDarkTheme={isDarkTheme}
            currentLanguage={currentLanguage}
            languages={languages}
            languagesNames={languagesNames}
            trackEvent={trackEvent}
          />
        </div>
      </div>
    </div>
  );
};
