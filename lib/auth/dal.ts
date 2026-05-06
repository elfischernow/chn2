// Client-side DAL for auth flows. Talks directly to vip-api — no Next proxy
// in the way. Cross-origin cookies work because production deploys serve the
// app on the same eTLD+1 as vip-api (the upstream sets `SameSite=None` /
// `Domain=.<root>` so the browser treats them as first-party); local/preview
// dev maps a sibling host in /etc/hosts so the same rule applies.
//
// Mirrors legacy `react-ssr/api/modules/dashboard/use-dashboard-*.js` 1:1,
// including the unified return shape (legacy `restRequestWrapper.js`):
//
//   { status, statusText, isError, data: <body> | { errorData, status } }
//
// Conventions kept verbatim:
//   - Network failure → `{ isError: true, data: { errorData: null, status: 0 } }`.
//     The auth orchestrator detects "errorData === null" as connection-error.
//   - HTTP 4xx/5xx with body → `{ isError: true, data: { errorData: <body>, status } }`.
//   - 204 → `{ status: 204, data: undefined, isError: false }`.
//
// Anything that needs different semantics (e.g. retry, dedupe) layers on top
// of these primitives — they stay dumb and predictable.

import { VIP_API_BASE } from '../config';

const API_BASE = VIP_API_BASE;

export interface DalResult<T = unknown> {
  status: number;
  statusText?: string;
  isError: boolean;
  /**
   * Either the parsed success body OR `{ errorData, status }` envelope on
   * failure. Mirrors legacy `restRequestWrapper.js` so the orchestrator
   * branches identically.
   */
  data: T | { errorData: unknown; status: number | null };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  /** Extra headers (X-XSRF-TOKEN etc.). */
  headers?: Record<string, string>;
  /** AbortSignal — caller-controlled (e.g. component unmount). */
  signal?: AbortSignal;
}

const getTimeZone = (): string | undefined => {
  if (typeof Intl === 'undefined') return undefined;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

const request = async <T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<DalResult<T>> => {
  const { method = 'GET', body, headers = {}, signal } = opts;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (body !== undefined && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  const tz = getTimeZone();
  if (tz && !finalHeaders['Time-Zone']) {
    finalHeaders['Time-Zone'] = tz;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Cross-origin → must be `'include'` so the upstream's session cookie
      // tags along (and any `Set-Cookie` from the response is persisted by
      // the browser). The upstream is required to send `SameSite=None;
      // Secure` and the right `Access-Control-Allow-Credentials: true`
      // header for this to land — see the deploy notes.
      credentials: 'include',
      signal,
      cache: 'no-store',
    });
  } catch (err) {
    // Network error / aborted / DNS / offline. Match legacy contract.
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Re-throw aborts so callers can distinguish unmount cancellation
      // from real failures. Same behaviour as legacy axios cancel.
      throw err;
    }
    return {
      status: 0,
      isError: true,
      data: { errorData: null, status: null },
    };
  }

  if (res.status === 204) {
    return {
      status: 204,
      statusText: res.statusText,
      isError: false,
      data: undefined as T,
    };
  }

  // Read body once. Some auth endpoints return JSON, some return plain text
  // on error pages. Try JSON first; fall back to text.
  const ct = res.headers.get('content-type') ?? '';
  let parsed: unknown;
  if (ct.includes('application/json')) {
    parsed = await res.json().catch(() => null);
  } else {
    const txt = await res.text().catch(() => '');
    parsed = txt ? { message: txt } : null;
  }

  if (!res.ok) {
    return {
      status: res.status,
      statusText: res.statusText,
      isError: true,
      data: { errorData: parsed, status: res.status },
    };
  }

  return {
    status: res.status,
    statusText: res.statusText,
    isError: false,
    data: parsed as T,
  };
};

// ─── Auth flows ────────────────────────────────────────────────────────────

export interface SignupParams {
  email: string;
  password: string;
  subscribeToNewsletter?: boolean;
  captcha?: string;
  utmData?: Record<string, string | undefined>;
  landingPage?: string;
}
export const signup = (params: SignupParams) =>
  request('v2.0/auth/signup/web', { method: 'POST', body: params });

export interface SigninParams {
  email: string;
  password: string;
  captcha?: string;
  code?: string;
  utmData?: Record<string, string | undefined>;
  landingPage?: string;
  linkOauth?: boolean;
}
export const signin = (params: SigninParams) =>
  request('v2.0/auth/signin/web', { method: 'POST', body: params });

export interface GoogleOauthParams {
  googleIdToken: string;
  code?: string;
}
export const googleOauth = (params: GoogleOauthParams) =>
  request('v1/o-auth/google/web', { method: 'POST', body: params });

export interface ForgotPasswordParams {
  email: string;
  captcha?: string;
}
export const forgotPassword = (params: ForgotPasswordParams) =>
  request('v1.1/auth/reset-password', { method: 'POST', body: params });

export interface ResetPasswordParams {
  password: string;
  token: string;
}
export const resetPassword = (params: ResetPasswordParams) =>
  request('v1.1/auth/reset-password', { method: 'PUT', body: params });

export interface TwoFaAuthenticateParams {
  code: string;
  linkOauth?: boolean;
}
export const twoFaAuthenticate = (params: TwoFaAuthenticateParams) =>
  request('v2.0/2fa/authenticate/web', { method: 'POST', body: params });

export interface SetUpLoginParams {
  email: string;
  password: string;
  emailCode?: string;
  /** From `cn_csrf` cookie — caller reads it and passes here. */
  csrfToken?: string;
}
export const setUpLogin = ({ csrfToken, ...body }: SetUpLoginParams) =>
  request('v2/users/set-up-login/web', {
    method: 'POST',
    body,
    headers: csrfToken ? { 'x-xsrf-token': csrfToken } : {},
  });

export interface ChangePasswordParams {
  password: string;
  oldPassword: string;
  code?: string;
  captcha?: string;
}
export const changePassword = (params: ChangePasswordParams) =>
  request('users/change-password', { method: 'POST', body: params });

// Email verification / resend. Two endpoints — legacy uses different ones
// for the `EmailConfirmation` flow (v1) vs the `RESEND_EMAIL` button on
// registration success (`/email-verification/resend`).
export const emailResendV1 = (email: string) =>
  request('v1/email-resend', { method: 'POST', body: { email } });

export const emailVerificationResend = (email: string) =>
  request(`email-verification/resend?email=${encodeURIComponent(email)}`);

// ─── User session ──────────────────────────────────────────────────────────

export interface UserSession {
  id: string | null;
  email: string | null;
  kycLevel: number;
  transactions: number;
  sumsubStatus: string | null;
  sumsubUpdatedAt: string | null;
  sumsubCountries: string[];
  balances: unknown[];
  isTwoFactorEnabled: boolean;
  address: string | null;
  subscription: {
    amlChecksLimit: number;
    level: unknown;
    nextBillingAt: string | null;
    status: string | null;
  };
  custody: {
    isActive: boolean;
    partnerId: string | null;
    email: string | null;
  };
  settings: {
    notifyExchange?: boolean;
    notifyExchangePro?: boolean;
  };
  /** Derived: email present but kycLevel === 0, OR address-only user. */
  isUserEmailNotConfirmed: boolean;
}

const mapMe = (raw: unknown): UserSession => {
  // Deliberately mirror legacy use-dashboard-user.js mapper. Defensive about
  // missing fields because the dashboard API has historically added optional
  // properties without bumping a version.
  const r = (raw ?? {}) as Record<string, unknown>;
  const sub = (r.subscription ?? {}) as Record<string, unknown>;
  const cust = (r.custody ?? {}) as Record<string, unknown>;
  const settings = (r.settings ?? {}) as Record<string, unknown>;
  const email = (r.email as string | null) ?? null;
  const kycLevel = (r.kycLevel as number | undefined) ?? 0;
  const address = (r.address as string | null) ?? null;
  const isUserEmailNotConfirmed =
    Boolean(email && !(kycLevel > 0)) || Boolean(!email && address);
  return {
    id: (r.id as string | null) ?? null,
    email,
    kycLevel,
    transactions: (r.transactions as number | undefined) ?? 0,
    sumsubStatus: (r.sumsubStatus as string | null) ?? null,
    sumsubUpdatedAt: (r.sumsubUpdatedAt as string | null) ?? null,
    sumsubCountries: (r.sumsubCountries as string[] | undefined) ?? [],
    balances: (r.balances as unknown[] | undefined) ?? [],
    isTwoFactorEnabled: (r.isTwoFactorEnabled as boolean | undefined) ?? false,
    address,
    subscription: {
      amlChecksLimit: (sub.amlChecksLimit as number | undefined) ?? 0,
      level: sub.level ?? null,
      nextBillingAt: (sub.nextBillingAt as string | null) ?? null,
      status: (sub.status as string | null) ?? null,
    },
    custody: {
      isActive: (cust.isActive as boolean | undefined) ?? false,
      partnerId: (cust.partnerId as string | null) ?? null,
      email: (cust.email as string | null) ?? null,
    },
    settings: {
      notifyExchange: settings.notifyExchange as boolean | undefined,
      notifyExchangePro: settings.notifyExchangePro as boolean | undefined,
    },
    isUserEmailNotConfirmed,
  };
};

export const getMe = async (signal?: AbortSignal): Promise<DalResult<UserSession>> => {
  const r = await request('users/me', { signal });
  if (r.isError) return r as DalResult<UserSession>;
  return { ...r, data: mapMe(r.data) };
};

// ─── Wallet flows (Metamask + WalletConnect) ───────────────────────────────

export interface MetamaskNonceResponse {
  secret?: string;
}
export const metamaskRequest = (address: string) =>
  request<MetamaskNonceResponse>('metamask/request', {
    method: 'POST',
    body: { address },
  });

interface MetamaskConfirmCommon {
  sign: string;
  address: string;
  message: unknown;
  utmData?: Record<string, string | undefined>;
  landingPage?: string;
}
export const metamaskConfirm = (params: MetamaskConfirmCommon) =>
  request('metamask/confirm', { method: 'POST', body: params });

export const metamaskConfirmPersonal = (params: MetamaskConfirmCommon) =>
  request('metamask/confirm-personal', { method: 'POST', body: params });

export const metamaskSetUpWallet = (params: MetamaskConfirmCommon) =>
  request('metamask/set-up-wallet', { method: 'POST', body: params });

export const metamaskSetUpWalletPersonal = (params: MetamaskConfirmCommon) =>
  request('metamask/set-up-wallet-personal', { method: 'POST', body: params });
