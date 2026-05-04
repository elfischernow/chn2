import type { FooterMobileNavigationProps } from '../types';
import { FooterListItem } from './footer-list-item';

export const FooterMobileNavigation = (props: FooterMobileNavigationProps) => {
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
    companyLinks,
    productLinks,
    partnerLinks,
    supportLinks,
    legalLinks,
    buyCryptoLinks,
    exchangeLinks,
    exchangePairsMobileGroups,
  } = props;

  return (
    <div className="footer--accordion">
      <section id="company">
        <a href="#content-1" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{companySectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-1">
          <div className="footer__navigation-item">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {companyLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="products" className="products-section">
        <a href="#content-2" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title new-badge__circle">
            {productSectionTitle}
          </div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content products-content" id="content-2">
          <div className="footer__navigation-item products-navigation-item">
            <ul className="footer__navigation-list">
              {productLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="for-partners">
        <a href="#content-3" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{partnerSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-3">
          <div className="footer__navigation-item">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {partnerLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="support">
        <a href="#content-4" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{supportSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-4">
          <div className="footer__navigation-item">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {supportLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="legal">
        <a href="#content-5" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{legalSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-5">
          <div className="footer__navigation-item">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {legalLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="buy-crypto">
        <a href="#content-6" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{buyCryptoSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-6">
          <div className="footer__navigation-item nowrap">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {buyCryptoLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="exchange">
        <a href="#content-7" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{exchangeSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-7">
          <div className="footer__navigation-item nowrap">
            <ul className="footer__navigation-list footer__navigation-list_autoheight">
              {exchangeLinks.map((item) => (
                <FooterListItem
                  item={item}
                  key={item.href}
                  currentUrl={currentUrl}
                  variant="mobile"
                />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="exchange_pairs">
        <a href="#content-8" className="footer--accordion-toggle">
          <div className="footer--accordion-toggle__title">{exchangePairsSectionTitle}</div>
          <img
            src="/images/cn-ui-kit/footer/expand-plus.svg"
            alt="toggle"
            width="12"
            height="12"
            className="footer--accordion-toggle__button"
            decoding="async"
          />
        </a>
        <div className="footer--accordion-content" id="content-8">
          {exchangePairsMobileGroups.map((group, index) => (
            <div
              className="exchange-pairs-end footer__navigation-item"
              key={`mobile-pairs-${index}`}
            >
              <ul className="footer__navigation-list">
                {group.map((item) => (
                  <FooterListItem
                    item={item}
                    key={item.href}
                    currentUrl={currentUrl}
                    variant="mobile"
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
