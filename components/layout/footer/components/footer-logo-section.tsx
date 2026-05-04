import type { FooterLogoSectionProps } from '../types';
import { FooterMobileApps } from './footer-mobile-apps';

export const FooterLogoSection = (props: FooterLogoSectionProps) => {
  const {
    localizationPrefix,
    mobileAppsTitle,
    isAppleDevice,
    isAndroidDevice,
    apkAndroidUrl,
    apkAndroidName,
    mobileLinks,
    qrCodeLink,
  } = props;

  return (
    <div className="footer--logotype">
      <a className="logotype" href={localizationPrefix}>
        <div className="logotype--main">
          <div className="svg-sprite--logotype" />
        </div>
      </a>
      <div className="footer--mobile-apps">
        <p>{mobileAppsTitle}</p>
        <FooterMobileApps
          isAppleDevice={isAppleDevice}
          isAndroidDevice={isAndroidDevice}
          apkAndroidUrl={apkAndroidUrl}
          apkAndroidName={apkAndroidName}
          mobileLinks={mobileLinks}
          qrCodeLink={qrCodeLink}
        />
      </div>
    </div>
  );
};
