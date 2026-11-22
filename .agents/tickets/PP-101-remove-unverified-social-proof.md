# PP-101: Remove unverifiable social proof, ratings schema, and placeholder testimonials

**Status:** ✅ Done
**Priority:** P0
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** —
**Blocks:** PP-111 (no public listings while fake proof is live), Product Hunt / review directories
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

The live homepage claims “Trusted by 50,000+ households,” “50K+ Active Users,” “2M+ Items Tracked,” “99.9% Uptime,” and a “4.8★ App Store Rating.” SoftwareApplication JSON-LD includes `aggregateRating` of 4.8 with `ratingCount` 50000. The footer CTA says “Join thousands of households.” Testimonials are attributed to “Sarah M.,” “James K.,” and “Alex T.”

The product has one paying subscriber. There is no Pantry Hub App Store listing in a straightforward web search (a differently named “Kitchen Hub” app is unrelated). These claims are not supported by evidence and the rating markup is a Google rich-results policy risk.

Source: `frontend/components/LandingPage.tsx` (`STATS`, `TESTIMONIALS`, badge, CTA), `frontend/components/SchemaMarkup.tsx` (`SoftwareApplicationSchema`, unused `AggregateRatingSchema`).

## Behavior

- Remove or replace every unverifiable stat, “trusted by / join thousands” line, App Store rating, and placeholder testimonial from the landing page and any other public surface.
- Remove `aggregateRating` / `AggregateRatingSchema` and testimonial `itemProp` review markup until there are real, first-party reviews to mark up.
- Do not invent replacement numbers. If a proof line is needed, use only facts Tylor has approved (for example a plain product description with no user counts).
- 99.9% uptime stays out unless there is a measured SLO to cite.

## Acceptance Criteria

- [x] Live homepage no longer shows 50K+ users, 2M+ items, 50,000+ households, 4.8 App Store rating, “thousands of households,” or the placeholder testimonials
- [x] No `aggregateRating` / review schema or review `itemProp` remains on public pages
- [x] Replacement copy, if any, is approved or is a neutral line with no new metrics
- [x] Privacy/terms/other pages checked for the same claims

## Resolution (2026-11-22)

Removed every invented number, rating, testimonial, and review/AggregateRating JSON-LD. Replaced them with true, legal social-proof copy (no invented figures or quotes):

- Hero badge: “Built by a home cook for real pantries”
- Proof row: built by a home cook; scan a barcode, done in seconds; free to start, no credit card; looks up 3M+ products via Open Food Facts (OFF’s public database is well above 3 million products)
- Mid-page cards: independent/small-team angle, “Your data stays yours,” and scan/track/shop feature-benefit proof
- Footer CTA: “Start free today — no credit card required.”

Privacy and terms had none of the fake claims. Follow-up for real testimonials, real counts, and Review schema only after there is first-party evidence: **PP-114**.
