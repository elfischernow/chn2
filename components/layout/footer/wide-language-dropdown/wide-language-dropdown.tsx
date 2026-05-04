'use client';

import cn from 'classnames';
import { type MouseEvent, useState } from 'react';

import { LANGUAGE_DROPDOWN_BLOG_PAGINATION_PAGES } from './constants';
import { extractMainPath } from './extract-main-path';
import {
  LanguageDropdownArrowIcon,
  LanguageDropdownIcon,
  NowCheckmarkIcon,
} from './icons';
import type { WideLanguageDropdownProps } from './types';

export const WideLanguageDropdown = (props: WideLanguageDropdownProps) => {
  const { currentLanguage, languages, languagesNames, currentPath, trackEvent } = props;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const mainPath = extractMainPath(currentPath, languages);
  const formattedPath = !mainPath || mainPath === '/' ? '' : mainPath;

  const handleLanguageChange = (event: MouseEvent<HTMLAnchorElement>, lang: string): void => {
    event.preventDefault();
    if (typeof window !== 'object') return;

    const { pathname, search } = window.location;
    const basePath = extractMainPath(pathname, languages);

    let trimmedPath = basePath;
    const pageIndex = basePath.indexOf('/page/');
    if (pageIndex !== -1) {
      const hasBlogPrefix = LANGUAGE_DROPDOWN_BLOG_PAGINATION_PAGES.some((pagePath) =>
        basePath.startsWith(pagePath),
      );
      if (hasBlogPrefix) trimmedPath = basePath.substring(0, pageIndex);
    }

    const targetPath = lang === 'en' ? trimmedPath : `/${lang}${trimmedPath}`;
    const fullPath = `${targetPath}${search}`;

    trackEvent({
      category: 'Localization Menu',
      action: 'select-localizaton',
      label: lang,
    });

    window.location.href = fullPath.replace('//', '/');
  };

  const getLanguageLink = (lang: string): string => {
    if (lang === 'en') return formattedPath === '' ? '/' : formattedPath;
    return `/${lang}${formattedPath}`;
  };

  return (
    <div
      className="wide-language-dropdown__wrapper"
      onMouseEnter={() => setIsDropdownOpen(true)}
      onMouseLeave={() => setIsDropdownOpen(false)}
    >
      <button type="button" className="wide-language-dropdown__dropdown">
        <div className="wide-language-dropdown__left">
          <LanguageDropdownIcon />
          <span className="wide-language-dropdown__text">
            {languagesNames[currentLanguage]}
          </span>
        </div>
        <LanguageDropdownArrowIcon
          className={cn([
            'wide-language-dropdown__icon',
            isDropdownOpen && 'wide-language-dropdown__icon_active',
          ])}
        />
      </button>
      {isDropdownOpen && (
        <div className="wide-language-dropdown__menu-wrapper">
          <menu className="wide-language-dropdown__menu">
            {languages?.map((lang) => (
              <li className="wide-language-dropdown__menu-item" key={lang}>
                <a
                  href={getLanguageLink(lang)}
                  onClick={(event) => handleLanguageChange(event, lang)}
                  className="wide-language-dropdown__menu-item-link"
                >
                  <span>{languagesNames[lang]}</span>
                  {lang === currentLanguage && <NowCheckmarkIcon />}
                </a>
              </li>
            ))}
          </menu>
        </div>
      )}
    </div>
  );
};
