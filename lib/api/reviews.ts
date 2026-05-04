import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_MEDIUM, CONTENT_API_BASEURL } from '../config';

/**
 * Public-facing review data. Two distinct kinds live here together:
 *
 * - B2C reviews are fetched live from the Strapi `/reviews` endpoint —
 *   recent 5-star community feedback (Trustpilot, Reddit, etc.).
 * - B2B reviews are partner testimonials from wallets that integrate our
 *   exchange. They're editorial and slow-moving (a handful at most), so
 *   we keep them as a hand-curated catalog mirroring the legacy SPA's
 *   `MAIN.RELIABLE_SERVICE.REVIEWS.*` i18n keys. The homepage rotates one
 *   into view at a time per the user's brief.
 */

// ---------- B2B (partner testimonials) ----------

export interface B2BReview {
  author: string;
  occupation: string;
  company: string;
  text: string;
  href: string;
  avatar: string;
  avatar2x: string;
}

/**
 * Curated list mirroring the legacy main-page slider — exactly the three
 * partner authors `main-page/main-page.jsx` rotates between (FIRST_AUTHOR
 * .. THIRD_AUTHOR keys). Texts are copied verbatim from our local
 * `MAIN.RELIABLE_SERVICE.REVIEWS.*` (en) i18n so they read the same as
 * legacy. Avatars are PNGs lifted from the legacy assets — see
 * `public/images/review-authors/`.
 *
 * (The fourth `FOURTH_AUTHOR` key from i18n — Paul Sokolov / Guarda — is
 * present in the dictionary but isn't part of the legacy main-page
 * rotation, so it's intentionally not surfaced here.)
 */
export const B2B_REVIEWS: readonly B2BReview[] = [
  {
    author: 'Paul Puey',
    occupation: 'CEO',
    company: 'Edge Wallet',
    text: 'It has been great working with the ChangeNOW team. They provide fast swaps with exceptional customer support and nearly zero technical issues. We are proud to have them as a partner in Edge.',
    href: 'https://edge.app',
    avatar: '/images/review-authors/Paul-Puey.png',
    avatar2x: '/images/review-authors/Paul-Puey@2x.png',
  },
  {
    author: 'Bobby Lee',
    occupation: 'CEO',
    company: 'Ballet',
    text: 'Integrating ChangeNOW currency exchange into the Ballet Crypto app has provided tremendous value and convenience for our users! Thanks ChangeNOW!',
    href: 'https://www.ballet.com',
    avatar: '/images/review-authors/Bobby-Lee.png',
    avatar2x: '/images/review-authors/Bobby-Lee@2x.png',
  },
  {
    author: 'Vik Sharma',
    occupation: 'CEO',
    company: 'Cake Wallet',
    text: 'Cake Wallet has integrated ChangeNOW for nearly five years, and we have an excellent relationship. ChangeNOW’s simplicity and reliability perfectly compliment the goals of our wallet.',
    href: 'https://cakewallet.com/',
    avatar: '/images/review-authors/Vik-Sharma.png',
    avatar2x: '/images/review-authors/Vik-Sharma-2x.png',
  },
];

/**
 * Pick which partner testimonial to feature this hour. Deterministic so
 * concurrent visitors see the same one within a window, but rotates often
 * enough that frequent visitors notice movement.
 */
export function pickRotatedB2B(now: number = Date.now()): B2BReview {
  const idx = Math.floor(now / 3_600_000) % B2B_REVIEWS.length;
  return B2B_REVIEWS[idx]!;
}

// ---------- B2C (community reviews from Strapi) ----------

export interface B2CReview {
  id: number;
  userName: string;
  reviewBody: string;
  stars: number;
  /** Display platform — normalized casing ("Trustpilot", "Reddit"). */
  platform: string;
  reviewLink: string | null;
}

interface UpstreamReview {
  id?: unknown;
  User_Name?: unknown;
  Review_Body?: unknown;
  Review_Link?: unknown;
  Stars?: unknown;
  Platform_Name?: unknown;
  Review_Date?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

// Reviews shorter than this read as throwaway ("nice"); longer than the
// upper bound break the card layout.
const MIN_BODY = 60;
const MAX_BODY = 240;

const looksLikeEmail = (name: string): boolean =>
  /@|hotmail|gmail|yahoo|outlook/i.test(name);

const cleanBody = (s: string): string =>
  s.replace(/\s+/g, ' ').trim();

const titleCasePlatform = (raw: string): string => {
  const map: Record<string, string> = {
    trustpilot: 'Trustpilot',
    reddit: 'Reddit',
    'google play': 'Google Play',
    appstore: 'App Store',
    'app store': 'App Store',
    bestchange: 'BestChange',
    swapzone: 'Swapzone',
    swapspace: 'SwapSpace',
    g2: 'G2',
    x: 'X',
  };
  return map[raw.toLowerCase().trim()] ?? raw;
};

async function fetchB2C(): Promise<B2CReview[]> {
  const host = CONTENT_API_BASEURL.replace(/\/$/, '');
  const url = `${host}/reviews?Stars=5&Type=social&_sort=Review_Date:DESC&_limit=30`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const raw = (await res.json().catch(() => null)) as UpstreamReview[] | null;
  if (!Array.isArray(raw)) return [];

  const out: B2CReview[] = [];
  for (const row of raw) {
    const userName = str(row.User_Name).trim();
    const body = cleanBody(str(row.Review_Body));
    const stars = num(row.Stars);
    const platform = str(row.Platform_Name).trim();
    if (!userName || looksLikeEmail(userName)) continue;
    if (body.length < MIN_BODY || body.length > MAX_BODY) continue;
    if (stars < 5) continue;
    if (!platform) continue;
    out.push({
      id: num(row.id),
      userName,
      reviewBody: body,
      stars,
      platform: titleCasePlatform(platform),
      reviewLink: str(row.Review_Link) || null,
    });
  }
  return out;
}

/**
 * Top-N most recent 5-star community reviews, lightly cleaned (length-
 * gated, email-looking authors filtered, platform casing normalized).
 * Cached for `CACHE_MEDIUM` (1h) — community feedback isn't time-critical
 * and the upstream Strapi shouldn't be hit on every request.
 */
export const getB2CReviews = unstable_cache(fetchB2C, ['reviews-b2c'], {
  revalidate: CACHE_MEDIUM,
  tags: ['reviews'],
});
