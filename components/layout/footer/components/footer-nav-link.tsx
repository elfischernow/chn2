import cn from 'classnames';

import type { FooterNavLinkProps } from '../types';

export const FooterNavLink = (props: FooterNavLinkProps) => {
  const { href, currentUrl, children, className, isNew, onClick } = props;
  const isActive = href === currentUrl;

  return (
    <a
      href={href}
      className={cn([className, isActive && 'active-navigation-link', isNew && 'new-badge'])}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
};
