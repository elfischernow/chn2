/**
 * Static catalog of fiat on-ramp providers and payment methods.
 *
 * The upstream `/v1.3/exchange/estimate` endpoint returns a `providers[]`
 * array keyed by `type` (`'guardarian'`, `'banxa'`, …). This catalog adds
 * brand presentation and the supported payment-method set — neither of
 * which the upstream surfaces.
 *
 * Why static, not fetched: the data is essentially editorial — brand name,
 * logo file, brand color, payment-method allowlist. It changes when we
 * onboard a new provider, not on a per-quote cadence. Fetching it on the
 * homepage would add a network round-trip for data that's effectively a
 * compile-time constant. Update this file when a new provider lights up.
 */

export type PaymentMethod =
  | 'visa'
  | 'mastercard'
  | 'apple-pay'
  | 'google-pay'
  | 'sepa'
  | 'ach'
  | 'swift'
  | 'pix'
  | 'revolut'
  | 'unionpay'
  | 'fasterpay';

/** Default set every provider supports — mirrors legacy `DEFAULT_METHODS`. */
const DEFAULT_METHODS: readonly PaymentMethod[] = [
  'visa',
  'mastercard',
  'sepa',
  'apple-pay',
  'google-pay',
];

export interface PaymentMethodInfo {
  label: string;
  /** Path under `/public`. Light variant — used on the default theme. */
  logoLight: string;
  /** Path under `/public`. Dark variant — swapped via `[data-theme="dark"]`. */
  logoDark: string;
}

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodInfo> = {
  visa: {
    label: 'Visa',
    logoLight: '/images/payment-methods/visa-light.svg',
    logoDark: '/images/payment-methods/visa-dark.svg',
  },
  mastercard: {
    label: 'Mastercard',
    logoLight: '/images/payment-methods/mastercard-light.svg',
    logoDark: '/images/payment-methods/mastercard-dark.svg',
  },
  'apple-pay': {
    label: 'Apple Pay',
    logoLight: '/images/payment-methods/apple-pay-light.svg',
    logoDark: '/images/payment-methods/apple-pay-dark.svg',
  },
  'google-pay': {
    label: 'Google Pay',
    logoLight: '/images/payment-methods/google-pay-light.svg',
    logoDark: '/images/payment-methods/google-pay-dark.svg',
  },
  sepa: {
    label: 'SEPA',
    logoLight: '/images/payment-methods/sepa-light.svg',
    logoDark: '/images/payment-methods/sepa-dark.svg',
  },
  ach: {
    label: 'ACH',
    logoLight: '/images/payment-methods/ach-light.svg',
    logoDark: '/images/payment-methods/ach-dark.svg',
  },
  swift: {
    label: 'SWIFT',
    logoLight: '/images/payment-methods/swift-light.svg',
    logoDark: '/images/payment-methods/swift-dark.svg',
  },
  pix: {
    label: 'PIX',
    logoLight: '/images/payment-methods/pix-light.svg',
    logoDark: '/images/payment-methods/pix-dark.svg',
  },
  revolut: {
    label: 'Revolut',
    logoLight: '/images/payment-methods/revolut-light.svg',
    logoDark: '/images/payment-methods/revolut-dark.svg',
  },
  unionpay: {
    label: 'UnionPay',
    logoLight: '/images/payment-methods/unionpay-light.svg',
    logoDark: '/images/payment-methods/unionpay-dark.svg',
  },
  fasterpay: {
    label: 'FasterPay',
    logoLight: '/images/payment-methods/fasterpay-light.svg',
    logoDark: '/images/payment-methods/fasterpay-dark.svg',
  },
};

export interface ProviderInfo {
  /** Lowercase brand id (matches upstream `provider.type`). */
  type: string;
  /** Display name. Used in the strip + selector. */
  label: string;
  /**
   * Logo image path. `null` falls back to a colored letter tile so unknown
   * providers (a new partner the upstream returns before we list them here)
   * still render. Brand sprites carry their own theme handling — the same
   * file is used in light and dark.
   */
  logoUrl: string | null;
  /** Tile color for the letter fallback. */
  brandColor: string;
  /**
   * Methods supported by this provider. Mirrors `PAYMENT_METHODS_BY_PROVIDER`
   * in `legacy/src/react-ssr/constants/payment-method.js` so the homepage
   * advertises the same options the legacy /exchange page renders.
   */
  paymentMethods: readonly PaymentMethod[];
}

const PROVIDERS: Record<string, ProviderInfo> = {
  guardarian: {
    type: 'guardarian',
    label: 'Guardarian',
    logoUrl: '/images/providers/guardarian.svg',
    brandColor: '#3a8edb',
    paymentMethods: [...DEFAULT_METHODS, 'revolut', 'swift', 'fasterpay'],
  },
  banxa: {
    type: 'banxa',
    label: 'Banxa',
    logoUrl: '/images/providers/banxa.svg',
    brandColor: '#1FCE9E',
    paymentMethods: [...DEFAULT_METHODS, 'pix', 'ach', 'fasterpay'],
  },
  simplex: {
    type: 'simplex',
    label: 'Simplex',
    logoUrl: '/images/providers/simplex.svg',
    brandColor: '#30A849',
    paymentMethods: [...DEFAULT_METHODS, 'pix', 'ach'],
  },
  transak: {
    type: 'transak',
    label: 'Transak',
    logoUrl: '/images/providers/transak.svg',
    brandColor: '#3061EA',
    paymentMethods: DEFAULT_METHODS,
  },
};

const FALLBACK: ProviderInfo = {
  type: 'unknown',
  label: 'Unknown',
  logoUrl: null,
  brandColor: '#666',
  paymentMethods: DEFAULT_METHODS,
};

/** Look up a provider's catalog info; returns a generic fallback on miss. */
export function getProviderInfo(type: string, label?: string): ProviderInfo {
  const key = (type ?? '').toLowerCase();
  const found = PROVIDERS[key];
  if (found) return found;
  return { ...FALLBACK, type: key, label: label ?? type };
}

/**
 * Hard-coded recommended provider for the homepage strip. Even when the
 * upstream estimator picks someone else as `summary.estimationFrom`, the
 * homepage promotes Guardarian — the platform's primary on-ramp partner —
 * so the marketing surface stays consistent and the badge keeps its
 * meaning between the front page and the legacy `/exchange` flow.
 */
export const FORCED_RECOMMENDED_PROVIDER = 'guardarian';
