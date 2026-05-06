'use client';

import { useEffect } from 'react';

import { useI18n } from '@/lib/i18n/client';

interface HighNetworkFeesModalProps {
  open: boolean;
  onCancel: () => void;
  onAccept: () => void;
}

/**
 * Confirmation modal shown when the upstream estimate flags the
 * destination network's withdrawal fee as unusually high relative to
 * the trade size. Mirrors the legacy `HighNetworkFeesModal` UX —
 * accept proceeds with the create-transaction call; cancel closes
 * and lets the user adjust amount or pair.
 *
 * Closes on Escape and on backdrop click. Body scroll is locked while
 * open so a long form below doesn't peek out the sides on mobile.
 */
export function HighNetworkFeesModal({
  open,
  onCancel,
  onAccept,
}: HighNetworkFeesModalProps) {
  const t = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="ex-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="ex-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ex-hf-title"
      >
        <h2 id="ex-hf-title" className="ex-modal-title">
          {t('EXCHANGE_STEPPER.HIGH_NETWORK_FEES.TITLE')}
        </h2>
        <p className="ex-modal-body">
          {t('EXCHANGE_STEPPER.HIGH_NETWORK_FEES.TEXT')}
        </p>
        <div className="ex-modal-actions">
          <button
            type="button"
            className="ex-modal-btn ex-modal-btn-secondary"
            onClick={onCancel}
          >
            {t('EXCHANGE_STEPPER.HIGH_NETWORK_FEES.BUTTON_CANCEL')}
          </button>
          <button
            type="button"
            className="ex-modal-btn ex-modal-btn-primary"
            onClick={onAccept}
          >
            {t('EXCHANGE_STEPPER.HIGH_NETWORK_FEES.BUTTON_ACCEPT')}
          </button>
        </div>
      </div>
    </div>
  );
}
