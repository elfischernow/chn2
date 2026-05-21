'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

import { useSession } from '@/lib/auth/useSession';

/**
 * Zendesk Messenger widget loader. Ported from the legacy
 * `src/client/components/zendesk-widget/index.js` with the Redux dependency
 * swapped for `useSession`. The script itself is identical (the same
 * `static.zdassets.com/ekr/snippet.js?key=` boot URL); only the surrounding
 * lifecycle is React-driven now.
 *
 * Behaviours preserved from legacy:
 *   - Prefill conversation fields (user id, email, current transaction id)
 *     so support agents see context without the user having to retype it.
 *   - Hide the launcher button on phone-sized viewports while the user is
 *     on a `/pro/*` page — the legacy app collided the bubble with the
 *     mobile bottom-nav, so it gets tucked away whenever both are present.
 *   - Re-prefill on every navigation: the conversation fields stick to
 *     whatever was set last, so a stale transaction id would otherwise
 *     follow the user across pages.
 *
 * Not ported (yet — gated on /exchange landing in this app):
 *   - `transactionId` tracking. Legacy pulled it from a Redux slice updated
 *     by the stepper; we have no stepper redux yet. `getTransactionId`
 *     below returns `null` until /exchange ships full tx state, then the
 *     prefill will start flowing again with no further changes here.
 *
 * Env contract (all `NEXT_PUBLIC_*` because the snippet runs client-side):
 *   - NEXT_PUBLIC_ZENDESK_WIDGET_KEY — required, the boot key from the
 *     Zendesk admin panel. Component renders nothing when missing.
 *   - NEXT_PUBLIC_ZENDESK_FIELD_USER_ID — Zendesk custom-field numeric id
 *     receiving the upstream partner id.
 *   - NEXT_PUBLIC_ZENDESK_FIELD_EMAIL — custom-field id for the user email.
 *   - NEXT_PUBLIC_ZENDESK_FIELD_TX_ID — custom-field id for the transaction
 *     id (forward-compat; unused while `getTransactionId` is null).
 */

const ZENDESK_KEY = process.env.NEXT_PUBLIC_ZENDESK_WIDGET_KEY;
const FIELD_USER_ID = process.env.NEXT_PUBLIC_ZENDESK_FIELD_USER_ID;
const FIELD_EMAIL = process.env.NEXT_PUBLIC_ZENDESK_FIELD_EMAIL;
const FIELD_TX_ID = process.env.NEXT_PUBLIC_ZENDESK_FIELD_TX_ID;

// `/pro/*` and any locale-prefixed variant (`/ru/pro/...`, `/de/pro/...`).
// Same matcher style the audience-switch effect in Header.tsx uses, so we
// stay consistent on "what counts as Pro".
const PRO_ROUTE_RE = /^(?:\/[a-z]{2,3})?\/pro(?:\/|$)/;
const MOBILE_MAX_W = 992;

type ZeFn = (action: string, target: string, payload?: unknown) => void;
declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var zE: ZeFn | undefined;
  // eslint-disable-next-line vars-on-top, no-var
  var zESettings: Record<string, unknown> | undefined;
}

interface ConversationField {
  id: string;
  value: string;
}

const getTransactionId = (): string | null => {
  // Forward-compat: until /exchange ships its tx-state store, there's
  // nothing to forward. Once it lands, this becomes
  // `useExchangeStore.getState().transactionId ?? null`.
  return null;
};

const setFields = (fields: ConversationField[]): void => {
  if (typeof window === 'undefined' || !window.zE || fields.length === 0) return;
  try {
    window.zE('messenger:set', 'conversationFields', fields);
  } catch {
    /* swallow — the widget may not be fully initialised yet */
  }
};

export function ZendeskWidget() {
  const { session } = useSession();
  const pathname = usePathname();

  // Re-prefill whenever the session or route changes. The widget keeps
  // whatever was set last call, so navigating off /exchange would otherwise
  // leave the old txId attached to all future conversations.
  useEffect(() => {
    if (!ZENDESK_KEY) return;
    const fields: ConversationField[] = [];
    const txId = getTransactionId();
    if (FIELD_TX_ID && txId) fields.push({ id: FIELD_TX_ID, value: txId });
    if (FIELD_EMAIL && session?.email) {
      fields.push({ id: FIELD_EMAIL, value: session.email });
    }
    if (FIELD_USER_ID && session?.custody?.partnerId) {
      fields.push({ id: FIELD_USER_ID, value: String(session.custody.partnerId) });
    }
    setFields(fields);
  }, [pathname, session?.email, session?.custody?.partnerId]);

  // Mobile-on-Pro launcher hide. The widget injects `#launcher` lazily
  // after the snippet finishes booting, so we poll for it for a few
  // seconds before giving up — same approach legacy used.
  useEffect(() => {
    if (!ZENDESK_KEY) return;
    let attempts = 0;
    let cancelled = false;

    const apply = () => {
      const launcher = document.getElementById('launcher');
      if (!launcher) {
        if (attempts++ < 40 && !cancelled) setTimeout(apply, 250);
        return;
      }
      const isProPage = PRO_ROUTE_RE.test(window.location.pathname);
      const isPhone = window.innerWidth <= MOBILE_MAX_W;
      launcher.style.display = isPhone && isProPage ? 'none' : '';
    };

    apply();
    window.addEventListener('resize', apply);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', apply);
    };
  }, [pathname]);

  if (!ZENDESK_KEY) return null;

  // `lazyOnload` waits until the browser is idle — the widget is below the
  // fold and only matters when the user actively reaches for support. Keeps
  // the snippet out of the LCP-critical path.
  return (
    <Script
      id="ze-snippet"
      src={`https://static.zdassets.com/ekr/snippet.js?key=${ZENDESK_KEY}`}
      strategy="lazyOnload"
    />
  );
}
