'use client';

/**
 * `<Overlay>` — the single primitive every popover/dropdown/modal in this
 * app routes through. Solves three problems at once:
 *
 *  1. Stacking. Portals into `#overlay-root` (declared in
 *     `app/[lang]/layout.tsx`) so the overlay escapes every ancestor
 *     stacking context — `backdrop-filter` on `.widget`, transformed
 *     sections, `z-index` on `.hero > *`, all of it. z-index tokens in
 *     `globals.css` (`--z-dropdown`, `--z-modal`) therefore behave as
 *     absolute values vs. the page chrome, not as relative-within-context.
 *
 *  2. Positioning. For anchored variants (`mode="popover"`) wires
 *     `@floating-ui/react` with `offset + flip + shift + size +
 *     autoUpdate` so the panel tracks the trigger across scroll/resize
 *     and never overflows the viewport.
 *
 *  3. Mobile UX. Below 720px both modes drop into a full-screen sheet
 *     (`mode="popover"` becomes a fullscreen surface, `mode="modal"`
 *     stays a fullscreen surface). The trigger anchor is irrelevant on
 *     phones — finger-sized lists work better edge-to-edge.
 *
 * Outside-click + Escape are wired via Floating UI's interaction hooks so
 * focus traps, scroll locking, and aria wiring stay consistent across
 * callers.
 */

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';

const OVERLAY_ROOT_ID = 'overlay-root';
// Single source of truth for the "mobile breakpoint" the overlay swaps to
// fullscreen at. Matches the 720px threshold the calculator uses for its
// own mobile layout — keeps the sheet from kicking in before the trigger
// has actually shifted to phone proportions.
const MOBILE_BP = 720;

function useIsMobile(): boolean {
  // Default to `false` server-side; the first client effect updates to
  // the real value. Overlays only render after a user interaction, so
  // there's no hydration content to mismatch.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

export interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /**
   * `popover` anchors to `anchorRef` on desktop, sheet on mobile.
   * `modal` is always a centered dialog (with backdrop) — falls through
   * to fullscreen on mobile.
   */
  mode?: 'popover' | 'modal';
  /** Required when `mode="popover"`. Ignored for modal. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** `aria-label` for screen-reader announcement of the dialog. */
  ariaLabel?: string;
  /** Disable the backdrop dim for popovers (default true for modal). */
  withBackdrop?: boolean;
  /** Optional extra class on the floating panel. */
  className?: string;
  /** Inline style passthrough (mostly for width pinning). */
  style?: CSSProperties;
  /** Suppress fullscreen-on-mobile (rare; default false). */
  disableMobileFullscreen?: boolean;
}

export function Overlay({
  open,
  onOpenChange,
  children,
  mode = 'popover',
  anchorRef,
  ariaLabel,
  withBackdrop,
  className,
  style,
  disableMobileFullscreen,
}: OverlayProps) {
  const isMobile = useIsMobile();
  const fullscreen = isMobile && !disableMobileFullscreen;
  // Modal always shows a backdrop. Popover shows none by default on
  // desktop (it's an anchored panel, not a dialog), but fullscreen-on-
  // mobile becomes a sheet — and a sheet without a backdrop looks
  // accidental, so we force one there. `withBackdrop` overrides either.
  const showBackdrop =
    withBackdrop ?? (mode === 'modal' || fullscreen);

  // Floating UI is configured for both modes so the same dismiss/role
  // wiring runs uniformly. For modal the position middleware is ignored
  // because we override `style` to fixed-center via CSS classes.
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement: 'bottom-start',
    middleware:
      mode === 'popover' && !fullscreen
        ? [
            offset(8),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            size({
              padding: 8,
              apply({ availableWidth, availableHeight, elements, rects }) {
                // Match trigger width by default; cap to viewport.
                Object.assign(elements.floating.style, {
                  minWidth: `${rects.reference.width}px`,
                  maxWidth: `${availableWidth}px`,
                  maxHeight: `${availableHeight}px`,
                });
              },
            }),
          ]
        : [],
    whileElementsMounted: autoUpdate,
  });

  // Feed the trigger element into Floating UI as the positioning
  // reference. We re-fire on `open` so the reference is bound before
  // the floating panel mounts (Floating UI only computes geometry once
  // both references are present).
  useEffect(() => {
    if (anchorRef?.current) refs.setReference(anchorRef.current);
  }, [anchorRef, refs, open]);

  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const role = useRole(context, { role: mode === 'modal' ? 'dialog' : 'listbox' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!open) return null;

  const panelStyle: CSSProperties = fullscreen
    ? {
        // Fullscreen sheet on mobile — pin to viewport, no anchor maths.
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
      }
    : mode === 'modal'
      ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 'var(--z-modal)' as unknown as number,
        }
      : {
          ...floatingStyles,
          zIndex: 'var(--z-dropdown)' as unknown as number,
        };

  const panel = (
    <FloatingFocusManager context={context} modal={mode === 'modal' || fullscreen}>
      <div
        ref={refs.setFloating}
        aria-label={ariaLabel}
        className={[
          'overlay-panel',
          mode === 'modal' ? 'overlay-panel-modal' : 'overlay-panel-popover',
          fullscreen ? 'overlay-panel-fullscreen' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ...panelStyle, ...style }}
        {...getFloatingProps()}
      >
        {children}
      </div>
    </FloatingFocusManager>
  );

  const content = showBackdrop ? (
    <FloatingOverlay
      lockScroll
      className="overlay-backdrop"
      style={{ zIndex: 'var(--z-overlay-backdrop)' as unknown as number }}
    >
      {panel}
    </FloatingOverlay>
  ) : (
    panel
  );

  return <FloatingPortal id={OVERLAY_ROOT_ID}>{content}</FloatingPortal>;
}

/**
 * SSR-safe helper for callers that want to portal arbitrary children
 * into the overlay root without going through `<Overlay>` (rare — only
 * for cases like a custom toast container that handles its own
 * dismissal). Returns null on the server.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const root = document.getElementById(OVERLAY_ROOT_ID);
  if (!root) return null;
  return createPortal(children, root);
}
