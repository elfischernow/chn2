/**
 * Infinite-scroll partner logo carousel — ported from the legacy SPA's
 * `react-ssr/components/main-page/components/partners`. Same idea: render
 * the catalog twice and animate `translateX(0 → -50%)` linearly. When the
 * keyframe loops, the second copy is now where the first started, so the
 * scroll appears continuous with no visible jump.
 *
 * The legacy version snapped at the edges; we wrap the whole thing in a
 * CSS `mask-image` linear-gradient so logos fade in from the left and out
 * to the right. Reads as a soft, ambient strip rather than a hard ticker.
 *
 * Animation pauses on hover.
 */

interface Partner {
  name: string;
  href: string;
  /** Dark-colored wordmark, designed to read on a light background. */
  logoLight: string;
  /** White wordmark, designed to read on a dark background. */
  logoDark: string;
  /** When true, partner gets `rel="dofollow"`. */
  doFollow?: boolean;
}

// Legacy file naming is the inverse of what the names suggest:
// `*-colored.svg` carries a *white* wordmark intended for dark backgrounds,
// and `*-dark.svg` carries a *dark/branded* wordmark for light backgrounds.
// We map them to logoLight/logoDark by visual purpose, not by filename.
const PARTNERS: readonly Partner[] = [
  { name: 'Exodus', href: 'https://www.exodus.com', logoLight: '/images/partner-logos/exodus-dark.svg', logoDark: '/images/partner-logos/exodus-colored.svg' },
  { name: 'NOW Payments', href: 'https://nowpayments.io/', logoLight: '/images/partner-logos/now-payments-dark.svg', logoDark: '/images/partner-logos/now-payments-colored.svg' },
  { name: 'CoinRabbit', href: 'https://coinrabbit.io/?referral=changenow', logoLight: '/images/partner-logos/coinrabbit-dark.svg', logoDark: '/images/partner-logos/coinrabbit-colored.svg', doFollow: true },
  { name: 'Tangem', href: 'https://tangem.com', logoLight: '/images/partner-logos/tangem-dark.svg', logoDark: '/images/partner-logos/tangem-colored.svg' },
  { name: 'Guarda', href: 'https://guarda.com', logoLight: '/images/partner-logos/guarda-dark.svg', logoDark: '/images/partner-logos/guarda-colored.svg' },
  { name: 'Cake Wallet', href: 'https://cakewallet.com', logoLight: '/images/partner-logos/cakewallet-dark.svg', logoDark: '/images/partner-logos/cakewallet-colored.svg' },
  { name: 'Edge', href: 'https://edge.app', logoLight: '/images/partner-logos/edge-dark.svg', logoDark: '/images/partner-logos/edge-colored.svg' },
  { name: 'Trezor', href: 'https://trezor.io', logoLight: '/images/partner-logos/trezor-dark.svg', logoDark: '/images/partner-logos/trezor-colored.svg' },
  { name: 'Trustee', href: 'https://trusteeglobal.com', logoLight: '/images/partner-logos/trustee-dark.svg', logoDark: '/images/partner-logos/trustee-colored.svg' },
  { name: 'Bitcoin.com', href: 'https://www.bitcoin.com', logoLight: '/images/partner-logos/bitcoin-dark.svg', logoDark: '/images/partner-logos/bitcoin-colored.svg' },
  { name: 'Houdini Swap', href: 'https://houdiniswap.com', logoLight: '/images/partner-logos/houdini-dark.svg', logoDark: '/images/partner-logos/houdini-colored.svg' },
  { name: 'Guardarian', href: 'https://guardarian.com', logoLight: '/images/partner-logos/guardarian-dark.svg', logoDark: '/images/partner-logos/guardarian-colored.svg' },
  // SwapZone ships a single neutral logo file for both themes.
  { name: 'SwapZone', href: 'https://swapzone.io/', logoLight: '/images/partner-logos/swapzone-logo.svg', logoDark: '/images/partner-logos/swapzone-logo.svg', doFollow: true },
  { name: 'LocalCoinSwap', href: 'https://localcoinswap.com', logoLight: '/images/partner-logos/localcoinswap-dark.svg', logoDark: '/images/partner-logos/localcoinswap-colored.svg' },
  { name: 'NOWWallet', href: 'https://walletnow.app', logoLight: '/images/partner-logos/now-wallet-logo-dark.svg', logoDark: '/images/partner-logos/now-wallet-colored.svg' },
];

export function PartnersCarousel() {
  // Render the list twice so the keyframe's `-50%` shift lands the duplicate
  // exactly where the original was, hiding the loop boundary.
  const doubled = [...PARTNERS, ...PARTNERS];

  return (
    <div className="prn-carousel" aria-label="Trusted by partners">
      <div className="prn-track">
        {doubled.map((p, i) => (
          <a
            key={`${p.name}-${i}`}
            className="prn-item"
            href={p.href}
            target="_blank"
            // The first set is the source of truth for SEO; the duplicate
            // is decorative (aria-hidden) and shouldn't be followed.
            rel={`noopener noreferrer ${p.doFollow ? 'dofollow' : 'nofollow'}`}
            aria-hidden={i >= PARTNERS.length || undefined}
            tabIndex={i >= PARTNERS.length ? -1 : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="prn-logo prn-logo-light"
              src={p.logoLight}
              alt={p.name}
              decoding="async"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="prn-logo prn-logo-dark"
              src={p.logoDark}
              alt=""
              decoding="async"
              loading="lazy"
              aria-hidden
            />
          </a>
        ))}
      </div>
    </div>
  );
}
