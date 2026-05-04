'use client';

import cn from 'classnames';
import QRCode from 'qrcode.react';
import { usePopperTooltip } from 'react-popper-tooltip';

import { NowQrIcon } from './now-qr-icon';
import type { MobileQrProps } from './types';

export const MobileQr = (props: MobileQrProps) => {
  const { qrCodeLink, className, color } = props;

  const { getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip({
    trigger: 'click',
    placement: 'top',
    offset: [0, 15],
    interactive: true,
    delayHide: 100,
  });

  return (
    <>
      <div
        className={cn([className, 'mobile-qr', visible && 'mobile-qr_active'])}
        ref={setTriggerRef}
      >
        <NowQrIcon color={color} />
      </div>
      {visible && (
        <div
          ref={setTooltipRef}
          {...getTooltipProps({ className: 'mobile-qr__tooltip' })}
        >
          <div className="mobile-qr__tooltip-content">
            <QRCode
              value={qrCodeLink ?? ''}
              width="100%"
              height="100%"
              renderAs="svg"
              bgColor="white"
            />
          </div>
        </div>
      )}
    </>
  );
};
