import { MobileQr } from '../mobile-qr/mobile-qr';
import type { FooterMobileAppsProps } from '../types';

export const FooterMobileApps = (props: FooterMobileAppsProps) => {
  const {
    isAppleDevice,
    isAndroidDevice,
    apkAndroidUrl,
    apkAndroidName,
    mobileLinks = {},
    qrCodeLink,
  } = props;

  return (
    <div className="mobile-apps-icons">
      {isAppleDevice && (
        <a
          className="footer-mobile-apps__link"
          href={mobileLinks.APP_STORE}
          target="_blank"
          rel="nofollow noopener noreferrer"
          data-track-outbound={mobileLinks.APP_STORE}
        >
          <img
            src="/images/cn-ui-kit/footer/mobile-exchange/app-store-mini.svg"
            width="85"
            height="32"
            alt="app-store icon"
            loading="lazy"
            decoding="async"
          />
        </a>
      )}
      {!isAppleDevice && isAndroidDevice && (
        <>
          <a
            className="footer-mobile-apps__link"
            href={mobileLinks.GOOGLE_PLAY}
            target="_blank"
            rel="nofollow noopener noreferrer"
            data-track-outbound={mobileLinks.GOOGLE_PLAY}
          >
            <img
              src="/images/cn-ui-kit/footer/mobile-exchange/google-play-mini.svg"
              width="91"
              height="32"
              alt="googleplay icon"
              loading="lazy"
              decoding="async"
            />
          </a>
          {apkAndroidUrl && (
            <a
              className="footer-mobile-apps__link"
              href={apkAndroidUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              data-track-event={JSON.stringify({
                category: 'app-download',
                label: apkAndroidName,
              })}
            >
              <img
                src="/images/cn-ui-kit/footer/mobile-exchange/apk-android-mini.svg"
                width="82"
                height="32"
                alt="android-apk icon"
                loading="lazy"
                decoding="async"
              />
            </a>
          )}
        </>
      )}
      {!isAppleDevice && !isAndroidDevice && (
        <>
          <a
            className="footer-mobile-apps__link"
            href={mobileLinks.APP_STORE}
            target="_blank"
            rel="nofollow noopener noreferrer"
            data-track-outbound={mobileLinks.APP_STORE}
          >
            <img
              src="/images/cn-ui-kit/footer/mobile-exchange/app-store-mini.svg"
              width="85"
              height="32"
              alt="app-store icon"
              loading="lazy"
              decoding="async"
            />
          </a>
          <a
            className="footer-mobile-apps__link"
            href={mobileLinks.GOOGLE_PLAY}
            target="_blank"
            rel="nofollow noopener noreferrer"
            data-track-outbound={mobileLinks.GOOGLE_PLAY}
          >
            <img
              src="/images/cn-ui-kit/footer/mobile-exchange/google-play-mini.svg"
              width="91"
              height="32"
              alt="googleplay icon"
              loading="lazy"
              decoding="async"
            />
          </a>
          <a
            className="footer-mobile-apps__link"
            href={apkAndroidUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            data-track-event={JSON.stringify({
              category: 'app-download',
              label: apkAndroidName,
            })}
          >
            <img
              src="/images/cn-ui-kit/footer/mobile-exchange/apk-android-mini.svg"
              width="82"
              height="32"
              alt="android-apk icon"
              loading="lazy"
              decoding="async"
            />
          </a>
        </>
      )}
      <div id="mobile-qr" data-qr-link={qrCodeLink || ''}>
        <MobileQr qrCodeLink={qrCodeLink} color="white" />
      </div>
    </div>
  );
};
