// Right-side "welcome" block on /authorization and /registration. Visible
// only on desktop (≥992px) — mobile hides via the .authorization-welcome
// CSS rule. Pixel-parity with legacy authorization-page.tsx:70-87.

import { createT, type TranslationDict } from '@/lib/i18n/createT';

import { DiamondIcon } from './icons/DiamondIcon';

interface WelcomePanelProps {
  dict: TranslationDict;
}

export function WelcomePanel({ dict }: WelcomePanelProps) {
  const t = createT(dict);
  return (
    <div className="authorization-welcome">
      <div className="authorization-welcome-title">
        <h1 className="authorization-welcome__title">
          {t('AUTHORIZATION.PERSONAL_TITLE')}{' '}
          <span className="authorization-welcome-icon">
            <DiamondIcon />
          </span>
        </h1>
      </div>
      <p className="authorization-welcome__text">
        {t('AUTHORIZATION.PERSONAL_TEXT')}
      </p>
    </div>
  );
}
