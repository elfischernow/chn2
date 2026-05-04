'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { EstimateProvider } from '@/lib/api/exchange';
import {
  FORCED_RECOMMENDED_PROVIDER,
  getProviderInfo,
  PAYMENT_METHODS,
  type PaymentMethod,
  type ProviderInfo,
} from '@/lib/providers/catalog';

interface FiatProviderStripProps {
  /** Providers returned by the latest estimate. May be empty while loading. */
  providers: readonly EstimateProvider[];
  /** Currently-selected provider type, or `null` to use the recommended one. */
  selectedType: string | null;
  /** Currency code shown next to the per-provider quote (TO currency). */
  toCurrency: string;
  onSelect: (type: string | null) => void;
  /** Number of provider quotes still pending — drives skeleton state. */
  isLoading?: boolean;
}

const formatAmount = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(2);
  if (abs >= 1) return n.toFixed(4).replace(/\.?0+$/, '');
  if (abs >= 0.001) return n.toFixed(6).replace(/\.?0+$/, '');
  return n.toFixed(8).replace(/\.?0+$/, '');
};

/** Letter-tile fallback when the catalog has no logo for a provider. */
/* eslint-disable @next/next/no-img-element --
 * Provider and payment-method marks are pre-sized SVGs/PNGs served from
 * /public. next/image's optimizer doesn't help (SVGs aren't re-encoded)
 * and routing them through the image proxy adds latency to the strip
 * which is rendered eagerly inside the calculator.
 */

function ProviderLogo({ info, size = 24 }: { info: ProviderInfo; size?: number }) {
  if (info.logoUrl) {
    // Provider sprites are self-contained (gradient fills + brand colors
    // baked in), so the same file works on both themes.
    return (
      <img
        className="prov-logo"
        src={info.logoUrl}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  return (
    <span
      className="prov-logo prov-logo-fallback"
      style={{ width: size, height: size, background: info.brandColor }}
      aria-hidden
    >
      {info.label.slice(0, 1)}
    </span>
  );
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  const info = PAYMENT_METHODS[method];
  return (
    <span className="pay-logo" title={info.label} aria-label={info.label}>
      <img className="pay-logo-light" src={info.logoLight} alt="" />
      <img className="pay-logo-dark" src={info.logoDark} alt="" />
    </span>
  );
}
/* eslint-enable @next/next/no-img-element */

const VISIBLE_PAY_LOGOS = 5;

export function FiatProviderStrip({
  providers,
  selectedType,
  toCurrency,
  onSelect,
  isLoading = false,
}: FiatProviderStripProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Recommended is hard-pinned to Guardarian on the homepage strip — the
  // upstream's `estimationFrom` rotates through the cheapest provider per
  // pair, but the marketing surface promotes the platform's primary on-ramp
  // partner consistently. If Guardarian isn't quoted for this pair, fall
  // back to the first quoted provider.
  const guardarianFromUpstream = providers.find(
    (p) => p.type === FORCED_RECOMMENDED_PROVIDER,
  );
  const recommended = guardarianFromUpstream ?? providers[0] ?? null;
  const selected =
    providers.find((p) => p.type === selectedType) ?? recommended;
  const selectedInfo = selected
    ? getProviderInfo(selected.type, selected.label)
    : getProviderInfo(FORCED_RECOMMENDED_PROVIDER);
  const selectedLabel = selected?.label ?? selectedInfo.label;
  const isShowingRecommended = selected?.type === recommended?.type;

  // Reorder the dropdown so the recommended provider sits first regardless
  // of upstream priority order, AND drop the currently-selected one — the
  // selected provider is already shown in the trigger row, so listing it
  // again in the dropdown is a duplicate the user has to scan past. The
  // dropdown becomes "alternatives to the current pick", which is what
  // a selector should show.
  const orderedProviders = useMemo(() => {
    const filtered = providers.filter((p) => p.type !== selected?.type);
    if (!recommended || recommended.type === selected?.type) return filtered;
    const rest = filtered.filter((p) => p.type !== recommended.type);
    return [recommended, ...rest];
  }, [providers, recommended, selected]);

  const visibleMethods = useMemo(
    () => selectedInfo.paymentMethods.slice(0, VISIBLE_PAY_LOGOS),
    [selectedInfo],
  );
  const extraMethodCount = Math.max(
    0,
    selectedInfo.paymentMethods.length - VISIBLE_PAY_LOGOS,
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const onChangeKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const commit = (type: string | null) => {
    onSelect(type);
    setOpen(false);
  };

  const showSelector = providers.length > 1;

  // Skeleton state: cover the strip with a shimmer until we have real
  // provider data. Only on the first load — subsequent refreshes (60s
  // tick) keep the existing strip visible to avoid the periodic flicker.
  const showSkeleton = isLoading && providers.length === 0;
  // Empty state: upstream returned no allowed providers for this pair
  // (rare — most fiat-crypto pairs have at least one). Show a friendly
  // "no offers" message so the user isn't staring at a fake brand.
  const showEmpty = !isLoading && providers.length === 0;

  if (showSkeleton) {
    return (
      <div className="swap-fiat-rec swap-fiat-rec-skel" aria-busy="true" aria-label="Loading providers">
        <div className="rec-line">
          <span className="rec-l">
            <span className="swap-skel-block rec-skel-logo" aria-hidden />
            <span className="swap-skel-block rec-skel-name" aria-hidden />
            <span className="swap-skel-block rec-skel-badge" aria-hidden />
          </span>
          <span className="swap-skel-block rec-skel-change" aria-hidden />
        </div>
        <div className="rec-pay">
          <span className="swap-skel-block rec-skel-pay-lbl" aria-hidden />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="swap-skel-block rec-skel-pay-logo" aria-hidden />
          ))}
        </div>
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="swap-fiat-rec swap-fiat-rec-empty" role="status">
        <span className="rec-empty-emoji" aria-hidden>😢</span>
        <span className="rec-empty-msg">Sorry, no offers found for now</span>
      </div>
    );
  }

  return (
    <div className="swap-fiat-rec" ref={containerRef} aria-label="On-ramp provider">
      <div className="rec-line">
        <span className="rec-l">
          <ProviderLogo info={selectedInfo} size={20} />
          <span className="rec-prov-name">{selectedLabel}</span>
          {isShowingRecommended && <RecommendedBadge />}
        </span>
        <span className="rec-r">
          {selected?.estimatedAmount != null && (
            // Selected provider's quote — mirrors the dropdown row layout
            // so the user sees the same estimate in the trigger as in the
            // pick they just made. Without this, switching providers
            // changed the strip's logo + name but their headline number
            // stayed in the swap field above, with no signal that the
            // selection actually moved.
            <span className="rec-amount">
              {formatAmount(selected.estimatedAmount)} {toCurrency.toUpperCase()}
            </span>
          )}
          {showSelector && (
            <button
              type="button"
              className="rec-change"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              onClick={() => setOpen((o) => !o)}
              onKeyDown={onChangeKey}
            >
              Change <span className="rec-change-caret" aria-hidden>▾</span>
            </button>
          )}
        </span>
        {/* Single-provider case: no selector to render — the strip just
            states what's available. */}
      </div>
      <div className="rec-pay">
        <span className="rec-pay-lbl">Pay with</span>
        {visibleMethods.map((m) => (
          <PaymentMethodIcon key={m} method={m} />
        ))}
        {extraMethodCount > 0 && (
          <span className="rec-pay-more">+{extraMethodCount} more</span>
        )}
      </div>

      {open && (
        <ul
          className="prov-pop"
          role="listbox"
          id={listboxId}
          aria-label="Choose provider"
        >
          {orderedProviders.map((p) => {
            const info = getProviderInfo(p.type, p.label);
            const isSelected = (selected?.type ?? '') === p.type;
            const isGuardarian = p.type === FORCED_RECOMMENDED_PROVIDER;
            const isRecPick = p.type === recommended?.type;
            // The upstream's `isRecommended` flag marks the cheapest
            // provider for this pair. We show "Best rate" on whichever
            // provider that is, unless it's also Guardarian (in which
            // case the "Recommended" badge already covers it).
            const showBestRate = p.isRecommended && !isGuardarian;
            return (
              <li
                key={p.type}
                role="option"
                aria-selected={isSelected}
                className="prov-pop-row"
                data-active={isSelected || undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(isRecPick ? null : p.type);
                }}
              >
                <ProviderLogo info={info} size={28} />
                <span className="prov-pop-name">
                  <strong>{p.label}</strong>
                  <span className="prov-pop-pay">
                    {/* Render the provider's full method set — slicing to a
                        fixed length always landed on the same DEFAULT_METHODS
                        prefix and made every row look identical. */}
                    {info.paymentMethods.map((m) => (
                      <PaymentMethodIcon key={m} method={m} />
                    ))}
                  </span>
                </span>
                <span className="prov-pop-meta">
                  {p.estimatedAmount != null && (
                    <span className="prov-pop-amount">
                      {formatAmount(p.estimatedAmount)} {toCurrency.toUpperCase()}
                    </span>
                  )}
                  {isGuardarian && <RecommendedBadge />}
                  {showBestRate && (
                    <span className="rec-badge rec-badge-best">Best rate</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Recommended pill — purple in the same hue family as Guardarian's brand
 * sprite, so the marketing tie-in reads visually without needing the
 * literal logo inside the badge.
 */
function RecommendedBadge() {
  return <span className="rec-badge rec-badge-recommended">Recommended</span>;
}
