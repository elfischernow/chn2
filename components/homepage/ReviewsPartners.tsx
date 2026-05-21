import { getB2CReviews, pickRotatedB2B, type B2CReview } from '@/lib/api/reviews';
import { BUSINESS, CN_SITE_URL, REVIEWS as REVIEW_LINKS } from '@/lib/links';

import { PartnersCarousel } from './PartnersCarousel';

// Soft palette for the B2C author chip — first letter lands on a tile in
// one of these hues, picked by a stable hash of the name. Keeps the row of
// avatars varied without requiring real photos we don't have for community
// reviewers.
const AVATAR_COLORS = [
  '#6c7eff', '#22a877', '#e07a3f', '#7c5cff', '#0098EA',
  '#c2a633', '#26A17B', '#23292F', '#FF5F4D', '#3a8edb',
];

function hashTo(name: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

function FiveStars() {
  return (
    <div className="rp-stars" aria-label="5 out of 5 stars">
      {'★★★★★'}
    </div>
  );
}

function PartnerSparkIcon() {
  return (
    <span className="rp-cta-icon" aria-hidden>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 3.5l2.7 6.55a4.5 4.5 0 0 0 2.45 2.45L25.7 15.2a.5.5 0 0 1 0 .9l-6.55 2.7a4.5 4.5 0 0 0-2.45 2.45L14 27.8a.5.5 0 0 1-.9 0l-2.7-6.55a4.5 4.5 0 0 0-2.45-2.45L1.4 16.1a.5.5 0 0 1 0-.9l6.55-2.7a4.5 4.5 0 0 0 2.45-2.45L13.1 3.5a.5.5 0 0 1 .9 0z"
          fill="url(#rp-cta-spark)"
        />
        <defs>
          <linearGradient id="rp-cta-spark" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4EA1F5" />
            <stop offset="0.5" stopColor="#5BC0DE" />
            <stop offset="1" stopColor="#76EAB1" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function ArrowGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function B2CCard({ review }: { review: B2CReview }) {
  const initial = review.userName.trim().slice(0, 1).toUpperCase();
  const color = AVATAR_COLORS[hashTo(review.userName, AVATAR_COLORS.length)]!;
  return (
    <div className="rp-review">
      <FiveStars />
      <p className="rp-quote">{review.reviewBody}</p>
      <div className="rp-meta">
        <span className="rp-avatar rp-avatar-letter" style={{ background: color }} aria-hidden>
          {initial}
        </span>
        <span className="rp-meta-text">
          <span className="rp-author">{review.userName}</span>
          <span className="rp-src">{review.platform}</span>
        </span>
      </div>
    </div>
  );
}

export async function ReviewsPartners() {
  // Fetch B2C in parallel with rotating B2B (B2B is sync but kept beside
  // the await for symmetry).
  const [b2c, b2b] = await Promise.all([getB2CReviews(), Promise.resolve(pickRotatedB2B())]);
  // Show one B2B partner card + two B2C cards. If the upstream is empty,
  // fall back to B2B-only — better than rendering nothing.
  const topB2C = b2c.slice(0, 2);

  return (
    <section className="rp-section">
      <div className="rp-head">
        <h2>
          People &amp; platforms <span className="tr-h2-light">vouch for us.</span>
        </h2>
      </div>

      <div className="rp-reviews">
        <div className="rp-reviews-head">
          <div className="rp-tp">
            <span className="rp-tp-mark">★</span>
            <span>
              <strong>4.7</strong> on Trustpilot · 5,200+ reviews
            </span>
          </div>
          {/* Arrow now lands on our own /reviews aggregate page rather than
              forwarding off-site to Trustpilot. */}
          <a className="rp-link" href={REVIEW_LINKS.all}>
            See all reviews →
          </a>
        </div>
        <div className="rp-reviews-grid">
          {/* B2B partner testimonial — one rotated card, marked with a
              "Partner" pill so it reads as editorial rather than community. */}
          <div className="rp-review rp-review-partner">
            <FiveStars />
            <p className="rp-quote">{b2b.text}</p>
            <div className="rp-meta">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rp-avatar"
                src={b2b.avatar}
                srcSet={`${b2b.avatar} 1x, ${b2b.avatar2x} 2x`}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
              />
              <span className="rp-meta-text">
                <span className="rp-author">{b2b.author}</span>
                <span className="rp-src">
                  {b2b.occupation} · <a className="rp-src-link" href={b2b.href} target="_blank" rel="noopener noreferrer">{b2b.company}</a>
                </span>
              </span>
              <span className="rp-tag rp-tag-partner">Partner</span>
            </div>
          </div>

          {topB2C.map((r) => (
            <B2CCard key={r.id} review={r} />
          ))}
        </div>
      </div>

      <div className="rp-bands">
        <div className="rp-band">
          <div className="rp-band-lbl">Trusted by partners</div>
          <PartnersCarousel />
        </div>
      </div>

      <div className="rp-cta">
        {/* Whole banner is the primary CTA — the overlay link covers the
            entire surface so any click lands on "Talk to BD". The secondary
            "Sign in to B2B" link sits above it via z-index. */}
        <a className="rp-cta-link" href={BUSINESS.contactBd} aria-label="Become a partner — talk to BD" />
        <span className="rp-cta-glow" aria-hidden />
        <div className="rp-cta-text">
          <PartnerSparkIcon />
          <div>
            <div className="rp-cta-eyebrow">Building something with crypto?</div>
            <div className="rp-cta-h">Become a partner.</div>
          </div>
        </div>
        <div className="rp-cta-actions">
          {/* Secondary outbound — sends existing affiliates straight to the
              B2B cabinet at `${CN_SITE_URL}/affiliate`. Same destination the
              header's business-mode auth buttons resolve to in
              `Header.tsx:160`. */}
          <a className="rp-cta-login" href={`${CN_SITE_URL}/affiliate`}>
            Sign in to B2B
            <ArrowGlyph />
          </a>
        </div>
      </div>
    </section>
  );
}
