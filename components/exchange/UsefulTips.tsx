'use client';

import { useState } from 'react';

import { useArrayFromFlatI18n, useI18n } from '@/lib/i18n/client';

interface UsefulTipsProps {
  /** When true, render the fixed-rate variant of the tips (different
   *  copy + a fixed-rate disclaimer). Mirrors the legacy
   *  `FixRateUsefulTips` branch from `useful-tips.jsx`. */
  fixedRate?: boolean;
}

interface TipItem {
  ID?: string;
  TIP?: string;
}

const isTipItem = (raw: unknown): raw is TipItem =>
  raw != null && typeof raw === 'object' && 'TIP' in raw;

/**
 * "Useful tips" section. The legacy SetTransactionStep ships three blocks
 * (success / wrong-address / cancellation) with one of two copy variants
 * (default vs. fixed-rate). All translation keys come from the same
 * `EXCHANGE_STEPPER.USEFUL_TIPS.*` namespace the legacy hits, so the dict
 * passed via `LocalizationProvider` already covers it.
 *
 * Collapsible by default — the entire section sits behind a disclosure
 * toggle so the form's primary CTA isn't pushed under the fold on mobile.
 * Per user direction: keep the i18n contract intact even while making it
 * collapsible.
 */
export function UsefulTips({ fixedRate = false }: UsefulTipsProps) {
  const t = useI18n();
  const [open, setOpen] = useState(false);

  const ns = fixedRate
    ? 'EXCHANGE_STEPPER.USEFUL_TIPS.FIXED_RATE'
    : 'EXCHANGE_STEPPER.USEFUL_TIPS';

  // The flat-tree helper returns `unknown[]` because the dict ships flat
  // strings — narrow per-item with a tiny guard so the `.map` below
  // doesn't have to fight the union.
  const successItems = useArrayFromFlatI18n(`${ns}.SUCCESS.ITEMS`).filter(isTipItem);
  const wrongItems = useArrayFromFlatI18n(`${ns}.WRONG.ITEMS`).filter(isTipItem);
  const cancelItems = useArrayFromFlatI18n(`${ns}.CANCEL.ITEMS`).filter(isTipItem);

  const titleKey = fixedRate
    ? 'EXCHANGE_STEPPER.USEFUL_TIPS.FIXED_RATE.TITLE'
    : 'EXCHANGE_STEPPER.USEFUL_TIPS.TITLE';

  return (
    <section className="ex-tips" data-open={open || undefined}>
      <button
        type="button"
        className="ex-tips-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ex-tips-title">{t(titleKey)}</span>
        <span className="ex-tips-caret" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="ex-tips-body">
          {fixedRate && (
            <p
              className="ex-tips-disclaimer"
              dangerouslySetInnerHTML={{
                __html: t('EXCHANGE_STEPPER.USEFUL_TIPS.FIXED_RATE.DISCLAIMER'),
              }}
            />
          )}

          <TipsBlock
            title={t(`${ns}.SUCCESS.TITLE`)}
            items={successItems}
            iconClass="ex-tip-icon ex-tip-icon-ok"
          />
          <TipsBlock
            title={t(`${ns}.WRONG.TITLE`)}
            items={wrongItems}
            iconClass="ex-tip-icon ex-tip-icon-no"
            footer={t(`${ns}.WRONG.CONTACT_SUPPORT`)}
          />
          <TipsBlock
            title={t(`${ns}.CANCEL.TITLE`)}
            items={cancelItems}
            iconClass="ex-tip-icon ex-tip-icon-info"
          />
        </div>
      )}
    </section>
  );
}

function TipsBlock({
  title,
  items,
  iconClass,
  footer,
}: {
  title: string;
  items: TipItem[];
  iconClass: string;
  footer?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="ex-tips-block">
      <h3 className="ex-tips-block-title">{title}</h3>
      <ul className="ex-tips-list">
        {items.map((item, i) => (
          <li key={item.ID ?? i} className="ex-tips-item">
            <span className={iconClass} aria-hidden />
            <p
              className="ex-tips-item-text"
              dangerouslySetInnerHTML={{ __html: item.TIP ?? '' }}
            />
          </li>
        ))}
      </ul>
      {footer && (
        <p
          className="ex-tips-block-footer"
          dangerouslySetInnerHTML={{ __html: footer }}
        />
      )}
    </div>
  );
}
