import { NextResponse } from 'next/server';

// Forwards every auth-related request to DASHBOARD_API_BASE_URL, preserving
// cookies in both directions. Matches the contract that legacy frontend's
// `dashboardRestTransport` (axios with `withCredentials: true`) provided —
// session lives in HTTP-only cookies set by the upstream.
//
// Why proxy at all (not call upstream from the browser):
//   - Cross-site cookies require both origins to send `SameSite=None; Secure`
//     and the upstream to be CORS-allowlisted with credentials. Easier to
//     same-origin everything via this proxy and let the browser treat the
//     cookies as first-party.
//   - One place to scrub headers we don't want round-tripped, to add
//     `Time-Zone` from the request, and to throttle bursts.
//   - One place to log unmapped error codes to Sentry later.
//
// What we DON'T do here:
//   - No business logic. Anything beyond passthrough belongs in lib/auth/dal
//     or in the orchestrator.
//   - No automatic retry. The dashboard API has its own backoff for 5xx; we
//     pass status codes through as-is.

const UPSTREAM_BASE_URL =
  process.env.DASHBOARD_API_BASE_URL ?? 'https://vip-api.bento.capital';

const UPSTREAM_TIMEOUT_MS = 10_000;

// Path allow-list. Everything legacy DAL hit against the dashboard API.
// Each entry is a regex against the joined path (after `/api/auth/`).
// Trailing query strings are not part of `path` — checked separately.
const ALLOWED_PATHS: ReadonlyArray<RegExp> = [
  /^v2\.0\/auth\/signin\/web$/,
  /^v2\.0\/auth\/signup\/web$/,
  /^v1\/o-auth\/google\/web$/,
  /^v1\.1\/auth\/reset-password$/,
  /^v2\.0\/2fa\/authenticate\/web$/,
  /^v2\/users\/set-up-login\/web$/,
  /^users\/me$/,
  /^users\/change-password$/,
  /^email-verification\/?$/,
  /^email-verification\/resend$/,
  /^v1\/email-resend$/,
  /^metamask\/request$/,
  /^metamask\/confirm$/,
  /^metamask\/confirm-personal$/,
  /^metamask\/set-up-wallet$/,
  /^metamask\/set-up-wallet-personal$/,
  /^v1\.1\/transactions$/,
];

// Headers we forward to the upstream from the client request. Anything not
// in this list is dropped — we don't want to leak `host`, hop-by-hop
// headers, or arbitrary client-set values to the dashboard API.
const REQUEST_HEADER_ALLOWLIST: ReadonlySet<string> = new Set([
  'accept',
  'accept-language',
  'content-type',
  'cookie',
  'time-zone',
  'x-xsrf-token',
  // Legacy axios sets `withCredentials: true` — cookies go automatically.
  // Custom auth doesn't apply here.
]);

// Headers we relay back from the upstream to the browser. `set-cookie` is
// the critical one — we need every refresh-token / session cookie to arrive
// first-party.
const RESPONSE_HEADER_ALLOWLIST: ReadonlySet<string> = new Set([
  'content-type',
  'cache-control',
  'set-cookie',
  'x-request-id',
]);

const buildUpstreamHeaders = (req: Request): Headers => {
  const out = new Headers();
  req.headers.forEach((value, name) => {
    if (REQUEST_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      out.set(name, value);
    }
  });

  // Time-Zone — legacy `getTimeZoneFormat()` reads from
  // `Intl.DateTimeFormat().resolvedOptions().timeZone` on the client. Here
  // it's optional — if the client sends it, forward; otherwise we leave it
  // off and the upstream falls back to UTC. The browser's `fetch` won't
  // populate this for us, so the DAL adds it explicitly.

  return out;
};

const buildResponseHeaders = (upstream: Response): Headers => {
  const out = new Headers();
  // `headers.getSetCookie()` is needed because multiple `Set-Cookie` headers
  // get folded by `forEach` in some runtimes. Available in Node 19+.
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    out.append('set-cookie', cookie);
  }
  upstream.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (lower === 'set-cookie') return; // handled above
    if (RESPONSE_HEADER_ALLOWLIST.has(lower)) out.set(name, value);
  });
  return out;
};

const isPathAllowed = (joined: string): boolean =>
  ALLOWED_PATHS.some((re) => re.test(joined));

const handle = async (
  req: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> => {
  const { path } = await context.params;
  const joined = path.join('/');

  if (!isPathAllowed(joined)) {
    return NextResponse.json(
      { error: 'forbidden', message: `Auth path not allowed: ${joined}` },
      { status: 403 },
    );
  }

  const incomingUrl = new URL(req.url);
  const upstreamUrl = new URL(joined, UPSTREAM_BASE_URL);
  // Forward query string verbatim — `/email-verification/resend?email=...`
  // is the only known consumer, but cheap to be general.
  incomingUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const headers = buildUpstreamHeaders(req);

  // Body forwarding: only for methods that legitimately carry a body. We use
  // the raw bytes (no JSON parse) so binary uploads pass through if ever
  // needed. The auth API today only sends JSON, but this future-proofs it.
  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body,
      // `cache: 'no-store'` — auth flows must not be cached by Next's data
      // cache, edge caches, or Service Worker.
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // We don't follow redirects: the dashboard API issues 30x rarely, and
      // when it does (e.g. consent OAuth flows) the browser must see them.
      redirect: 'manual',
    });
  } catch (err) {
    const reason = err instanceof Error ? err.name : 'unknown';
    return NextResponse.json(
      { error: 'upstream_unreachable', reason, message: 'Auth service unavailable' },
      { status: 502 },
    );
  }

  const responseHeaders = buildResponseHeaders(upstream);
  // Pin no-store. Some upstream responses default to `private, no-cache`,
  // which is fine, but the dashboard API also returns 200/204 with no
  // cache header — those would be cacheable by Next's fetch cache without
  // an explicit override. The proxy already sets `cache: 'no-store'` for
  // the upstream call; this header pins client-side behaviour too.
  responseHeaders.set('Cache-Control', 'no-store');

  // 204 means body == null in `Response` — preserve that.
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  // Stream-through; the upstream may return JSON or empty. We don't parse —
  // the DAL layer does. Setting body via arrayBuffer keeps Content-Length
  // correct.
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
