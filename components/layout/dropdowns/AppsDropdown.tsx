import React from 'react';
import QRCode from 'qrcode.react';
import { usePopperTooltip } from 'react-popper-tooltip';
import { Locale } from '@/lib/config';
import { TranslationDict } from '@/lib/i18n';
import styles from './dropdowns.module.css';
import { createT } from '@/lib/i18n/createT';
import { DropdownColumn } from './DropdownColumn';
import {
  HEADER_MOBILE_APPS_BUTTONS,
  HEADER_NAVIGATION_LINKS
} from '@/app/utils/constants/header';

interface AppsDropdownProps {
  locale: Locale;
  dict: TranslationDict;
  apkAndroidUrl: string;
  /**
   * QR-target URL for the "scan to install" flow. Sourced from the server
   * env (`MOBILE_APPS_LINK`) and threaded through props because client
   * components can't read non-`NEXT_PUBLIC_*` env vars.
   */
  mobileAppsUrl?: string;
}

const AppsDropdown = (props: AppsDropdownProps) => {
  const {
    locale,
    dict,
    apkAndroidUrl,
    mobileAppsUrl = '',
  } = props;
  const t = createT(dict);
  const qrCodeUrl = mobileAppsUrl;

  const {
    getTooltipProps,
    setTooltipRef,
    setTriggerRef,
    visible,
  } = usePopperTooltip({
    trigger: 'hover',
    placement: 'top',
    offset: [0, 15],
    interactive: true,
    delayHide: 100,
  });

  const handleMobileAppButtonClick = (link: string) => {
    if (link === 'qrCodeUrl') {
      return;
    }

    // `window.location.assign` instead of mutating `.href` directly so the
    // React compiler doesn't flag the assignment as a forbidden write to a
    // value defined outside the component.
    window.location.assign(link === 'apkUrl' ? apkAndroidUrl : link);
  };

  return (
    <div className={`${styles.dropdown} ${styles.columnsDropdown}`} role="menu">
      <div className={styles.appsWrapper}>
        <div className={styles.mobileApps}>
          <div className={styles.mobileAppsContent}>
            <span className={styles.mobileAppsTitle}>Download mobile app</span>
            <div className={styles.buttonsGroup}>
              {HEADER_MOBILE_APPS_BUTTONS.map((button) => {
                const Icon = button.icon;
                const isQrButton = button.href === 'qrCodeUrl';

                return (
                  <button
                    ref={isQrButton ? setTriggerRef : null}
                    className={`${styles.mobileAppsButton} ${isQrButton && visible ? styles.mobileAppsButton_active : ''}`}
                    key={button.id}
                    onClick={() => handleMobileAppButtonClick(button.href)}
                  >
                    <Icon />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {visible && (
          <div
            ref={setTooltipRef}
            {...getTooltipProps({
              className: 'mobile-qr__tooltip',
              style: { zIndex: 100 }
            })}
          >
            <div className="mobile-qr__tooltip-content">
              <QRCode
                value={qrCodeUrl}
                width="100%"
                height="100%"
                renderAs="svg"
                bgColor="white"
              />
            </div>
          </div>
        )}

        <div className={styles.columns}>
          <DropdownColumn
            title="For personal use"
            items={HEADER_NAVIGATION_LINKS.forPersonalUse}
            locale={locale}
            t={t}
          />
          <DropdownColumn
            title="For business"
            items={HEADER_NAVIGATION_LINKS.forBusiness}
            locale={locale}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

export default AppsDropdown;