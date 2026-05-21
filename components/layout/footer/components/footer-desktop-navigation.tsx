import { TrustpilotLazy } from '@/components/homepage/TrustpilotLazy';

import type { FooterDesktopNavigationProps } from '../types';
import { WideLanguageDropdown } from '../wide-language-dropdown/wide-language-dropdown';
import { FooterListItem } from './footer-list-item';

export const FooterDesktopNavigation = (props: FooterDesktopNavigationProps) => {
  const {
    currentUrl,
    companySectionTitle,
    productSectionTitle,
    partnerSectionTitle,
    supportSectionTitle,
    legalSectionTitle,
    buyCryptoSectionTitle,
    exchangeSectionTitle,
    exchangePairsSectionTitle,
    followUsTitle,
    copyrightText,
    copyrightDescription,
    companyLinks,
    productLinks,
    partnerLinks,
    supportLinks,
    legalLinks,
    buyCryptoLinks,
    exchangeLinks,
    exchangePairsDesktopColumns,
    socialLinksData,
    isDarkTheme,
    currentLanguage,
    languages,
    languagesNames,
    trackEvent,
  } = props;

  const isLanguageDropdownDisplayed =
    languages && languages.length > 1 && currentLanguage && !!trackEvent;

  return (
    <>
      <div className="desktop-footer">
        <nav className="footer__navigation" role="navigation">
          <div className="footer__navigation-item">
            <div className="footer__navigation-title">{companySectionTitle}</div>
            <ul className="footer__navigation-list">
              {companyLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="footer__navigation-item">
            <div className="footer__navigation-title">{productSectionTitle}</div>
            <ul className="footer__navigation-list">
              {productLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="footer__navigation-item">
            <div className="footer__navigation-title">{partnerSectionTitle}</div>
            <ul className="footer__navigation-list">
              {partnerLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="footer__navigation-item">
            <div className="footer__navigation-title">{supportSectionTitle}</div>
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {supportLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="footer__navigation-item last-column">
            <div className="footer__navigation-title">{legalSectionTitle}</div>
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {legalLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="footer--bottom" />

      <div className="social-copyright__mobile">
        <div className="footer--links">
          {!isDarkTheme ? (
            // Lazy, client-only mount of the Mini TrustBox. `ssr: false`
            // skips the SSR shell entirely — Trustpilot's bootstrap script
            // owns the node's children post-mount, and there's nothing
            // for React's hydrator to reconcile against.
            <TrustpilotLazy
              template="53aa8807dec7e10d38f59f32"
              theme="dark"
              height={150}
              className="footer__trustpilot-widget"
            />
          ) : null}
          <span className="separator" />
          <div className="bestchange">
            <div className="icon-bestchange footer--bestchange">
              <img
                src="/images/cn-ui-kit/footer/bestchange-footer.svg"
                width="115"
                height="24"
                alt="Bestchange"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
        <div className="footer__social-copyright">
          <div className="footer--social-wrapper">
            {socialLinksData.map((item) => (
              <a
                key={`mobile-social-${item.id}`}
                className="footer--social"
                href={item.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                data-track-outbound={item.href}
              >
                <img
                  src={item.icon}
                  alt={item.alt}
                  className="social-icon"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>
          <div className="footer--copyright">
            <div className="copyright">
              <span
                className="footer--copyright-text"
                dangerouslySetInnerHTML={{ __html: copyrightText }}
              />
              <span
                className="footer--copyright-description"
                dangerouslySetInnerHTML={{ __html: copyrightDescription }}
              />
            </div>
          </div>
        </div>
        {isLanguageDropdownDisplayed && (
          <WideLanguageDropdown
            currentLanguage={currentLanguage || ''}
            languages={languages || []}
            languagesNames={languagesNames || {}}
            currentPath={currentUrl}
            trackEvent={trackEvent}
          />
        )}
      </div>
      <div className="footer-sections-separator" />
      <div className="desktop-footer">
        <nav className="footer__navigation" role="navigation">
          <div className="footer__navigation-item nowrap">
            <div className="footer__navigation-title">{buyCryptoSectionTitle}</div>
            <ul className="footer__navigation-list">
              {buyCryptoLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="footer__navigation-item nowrap">
            <div className="footer__navigation-title">{exchangeSectionTitle}</div>
            <ul className="footer__navigation-list">
              {exchangeLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="desktop"
                />
              ))}
            </ul>
          </div>

          <div className="pairs">
            <div className="footer__navigation-item exchange-pairs first-pairs-column">
              <div className="footer__navigation-title">{exchangePairsSectionTitle}</div>
              <ul className="footer__navigation-list">
                {exchangePairsDesktopColumns[0].map((item) => (
                  <FooterListItem
                    item={item}
                    key={item.href}
                    currentUrl={currentUrl}
                    variant="desktop"
                  />
                ))}
              </ul>
            </div>
            <div className="footer__navigation-item exchange-pairs without-title">
              <ul className="footer__navigation-list">
                {exchangePairsDesktopColumns[1].map((item) => (
                  <FooterListItem
                    item={item}
                    key={item.href}
                    currentUrl={currentUrl}
                    variant="desktop"
                  />
                ))}
              </ul>
            </div>
            <div className="footer__navigation-item exchange-pairs without-title">
              <ul className="footer__navigation-list">
                {exchangePairsDesktopColumns[2].map((item) => (
                  <FooterListItem
                    item={item}
                    key={item.href}
                    currentUrl={currentUrl}
                    variant="desktop"
                  />
                ))}
              </ul>
            </div>
          </div>

          <div className="footer__navigation-item social-copyright last-column">
            <div className="footer__social-copyright">
              <div className="footer--links">
                {!isDarkTheme ? (
                  <TrustpilotLazy
                    template="53aa8807dec7e10d38f59f32"
                    theme="dark"
                    height={150}
                    className="footer__trustpilot-widget"
                  />
                ) : null}
                <div className="bestchange">
                  <div className="icon-bestchange footer--bestchange">
                    <img
                      decoding="async"
                      loading="lazy"
                      src="/images/cn-ui-kit/footer/bestchange-footer.svg"
                      alt="Bestchange"
                      width="115"
                      height="24"
                    />
                  </div>
                </div>
              </div>
              <div className="footer__navigation-title follow-us-title">
                {followUsTitle}
                <div className="footer--social-wrapper">
                  {socialLinksData.map((item) => (
                    <a
                      key={`desktop-social-${item.id}`}
                      className="footer--social"
                      href={item.href}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      data-track-outbound={item.href}
                    >
                      <img
                        decoding="async"
                        loading="lazy"
                        src={item.icon}
                        alt={item.alt}
                        className="social-icon"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>
        <div className="footer--copyright">
          <div className="copyright">
            <span
              className="footer--copyright-text"
              dangerouslySetInnerHTML={{ __html: copyrightText }}
            />
            <span
              className="footer--copyright-description"
              dangerouslySetInnerHTML={{ __html: copyrightDescription }}
            />
          </div>
          {isLanguageDropdownDisplayed && (
            <WideLanguageDropdown
              currentLanguage={currentLanguage || ''}
              languages={languages || []}
              languagesNames={languagesNames || {}}
              currentPath={currentUrl}
              trackEvent={trackEvent}
            />
          )}
        </div>
      </div>
    </>
  );
};
