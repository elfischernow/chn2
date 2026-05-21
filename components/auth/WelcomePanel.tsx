// Right-side column on /authorization. Visible at ≥992px only. The earlier
// version used a bulleted value-prop list with privacy/no-KYC framing — we
// dropped both because (a) bullet-soup competed with the form for
// attention and (b) "no KYC" messaging is a regulatory red flag we don't
// want surfaced anywhere on the page. The current copy positions ChangeNOW
// as a money-management service first; privacy stays as a quiet promise.

import { createT, type TranslationDict } from '@/lib/i18n/createT';

interface WelcomePanelProps {
  dict: TranslationDict;
}

export function WelcomePanel({ dict }: WelcomePanelProps) {
  const t = createT(dict);
  // Lead-text approach: one bold opening sentence (the value), one calm
  // paragraph explaining the receipt, one small footer line for privacy.
  // The bold span is wrapped client-side via `<strong>` so we don't have
  // to ship raw HTML through the translation string.
  return (
    <aside className="authorization-welcome">
      <span className="auth-value-prop__eyebrow">
        {t('AUTHORIZATION.VALUE_PROP.EYEBROW', 'Trusted since 2017')}
      </span>
      <h2 className="auth-value-prop__title">
        {t('AUTHORIZATION.VALUE_PROP.TITLE', 'A simpler way to manage your crypto.')}
      </h2>
      <p className="auth-value-prop__lead">
        <strong>
          {t(
            'AUTHORIZATION.VALUE_PROP.LEAD_STRONG',
            'Buy, trade and manage your portfolio',
          )}
        </strong>
        {' — '}
        {t(
          'AUTHORIZATION.VALUE_PROP.LEAD_REST',
          'with personalized offers, pro-grade tools and your saved setup across every device.',
        )}
      </p>
    </aside>
  );
}
