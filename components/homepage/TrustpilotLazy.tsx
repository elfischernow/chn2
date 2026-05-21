'use client';

import dynamic from 'next/dynamic';

import type { TrustpilotWidgetProps } from './TrustpilotWidget';

/**
 * Client-only TrustpilotWidget. Two reasons for the lazy wrapper:
 *
 *   1. **Dodges hydration entirely.** Trustpilot's bootstrap script swaps
 *      our wrapper's children out for an `<iframe>` after mount. With
 *      SSR off, the server never emits the wrapper at all — there's
 *      nothing for React's hydrator to reconcile against, so the
 *      element-type subtree change becomes a non-event.
 *
 *   2. **Defers the script + iframe work** until after the page is
 *      interactive (combined with `next/script`'s `lazyOnload`
 *      strategy upstream), which keeps the bootstrap cost off the
 *      critical path.
 *
 * `next/dynamic` with `ssr: false` is itself a client-only feature —
 * hence this wrapper carries `'use client'` so server components can
 * import `<TrustpilotLazy />` directly without tripping Next 16's
 * "ssr: false in a Server Component" guard.
 */
const TrustpilotWidget = dynamic(
  () => import('./TrustpilotWidget').then((m) => m.TrustpilotWidget),
  {
    ssr: false,
    loading: () => null,
  },
);

export function TrustpilotLazy(props: TrustpilotWidgetProps) {
  return <TrustpilotWidget {...props} />;
}
