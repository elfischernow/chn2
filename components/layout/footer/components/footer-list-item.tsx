import cn from 'classnames';

import type { AnchorProps, FooterListItemProps, NavProps } from '../types';
import { FooterNavLink } from './footer-nav-link';

export const FooterListItem = (props: FooterListItemProps) => {
  const { item, currentUrl = '', variant = 'mobile' } = props;

  const {
    type = 'nav',
    href = '',
    label,
    liClassName,
    anchorClassName,
    iconAfterUrl,
    isNew,
    anchorProps = {},
    navProps = {},
    beforeIconUrl,
    afterIconUrl,
    mobileLiClassName,
    mobileAnchorClassName,
    mobileAnchorProps,
    mobileNavProps,
    mobileBeforeIconUrl,
    mobileAfterIconUrl,
    mobileIconAfterUrl,
    desktopLiClassName,
    desktopAnchorClassName,
    desktopAnchorProps,
    desktopNavProps,
    desktopBeforeIconUrl,
    desktopAfterIconUrl,
    desktopIconAfterUrl,
  } = item;

  const isMobile = variant === 'mobile';

  const variantLiClassName = isMobile ? mobileLiClassName : desktopLiClassName;
  const variantAnchorClassName = isMobile ? mobileAnchorClassName : desktopAnchorClassName;
  const variantAnchorProps = (isMobile ? mobileAnchorProps : desktopAnchorProps) ?? {};
  const variantNavProps = (isMobile ? mobileNavProps : desktopNavProps) ?? {};
  const variantBeforeIconUrl = isMobile ? mobileBeforeIconUrl : desktopBeforeIconUrl;
  const variantAfterIconUrl = isMobile ? mobileAfterIconUrl : desktopAfterIconUrl;
  const variantIconAfterUrl = isMobile ? mobileIconAfterUrl : desktopIconAfterUrl;

  const linkClassName = cn(anchorClassName, variantAnchorClassName);
  const finalAnchorProps: AnchorProps = { ...anchorProps, ...variantAnchorProps };
  const finalNavProps: NavProps = { ...navProps, ...variantNavProps };

  const finalBeforeIconUrl = variantBeforeIconUrl ?? beforeIconUrl;
  const finalAfterIconUrl = variantAfterIconUrl ?? afterIconUrl;
  const finalIconAfterUrl = variantIconAfterUrl ?? iconAfterUrl;

  return (
    <li
      className={cn(['footer__navigation-list-item', liClassName, variantLiClassName])}
    >
      {finalBeforeIconUrl && (
        <img
          src={finalBeforeIconUrl}
          alt="new"
          className="new-badge__circle_tooltip-new"
          decoding="async"
          loading="lazy"
        />
      )}
      {type === 'nav' ? (
        <FooterNavLink
          href={href}
          currentUrl={currentUrl}
          className={cn(linkClassName, finalNavProps.className)}
          isNew={isNew}
          onClick={finalNavProps.onClick}
        >
          {label}
          {finalIconAfterUrl && (
            <img
              src={finalIconAfterUrl}
              alt="foreign link"
              className="foreign-link-icon"
              decoding="async"
              loading="lazy"
            />
          )}
        </FooterNavLink>
      ) : (
        <a
          href={href}
          className={cn(linkClassName, finalAnchorProps.className)}
          onClick={finalAnchorProps.onClick}
          target="_blank"
          rel="nofollow noopener"
          data-track-outbound={finalAnchorProps['data-track-outbound']}
          data-track-event={finalAnchorProps['data-track-event']}
        >
          {label}
          {finalIconAfterUrl && (
            <img
              src={finalIconAfterUrl}
              alt="foreign link"
              className="foreign-link-icon"
              decoding="async"
              loading="lazy"
            />
          )}
        </a>
      )}
      {finalAfterIconUrl && (
        <img src={finalAfterIconUrl} alt="" decoding="async" loading="lazy" />
      )}
    </li>
  );
};
