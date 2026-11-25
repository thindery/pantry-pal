# PP-101: Remove unverifiable social proof, ratings schema, and placeholder testimonials

**Status:** 🔍 In review (follow-up copy PR, branch seo/PP-101-approved-proof-copy; not deployed)
**Priority:** P0
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Completed (original fake-proof removal):** 2026-11-22
**Updated:** 2026-11-22, 4:26 PM America/Chicago — Tylor copy + item-count follow-up
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

---

## Follow-up (Tylor, 2026-11-22, 4:26 PM America/Chicago)

The original invented stats, testimonials, and review / `aggregateRating` JSON-LD are already gone on the live homepage (commit `5bde620`). Do not put them back. Tylor asked for generic replacement lines, and for a production item count before “Hundreds of items tracked” goes live.

### Production item count (read-only)

- When: Sunday, Nov 22, 2026, about 4:29 PM America/Chicago
- How: `ssh ovh`, then `docker exec` into `pantry-pal-db` as `pantry_pal_user` / `pantry_pal_prod`. Query only: `SELECT COUNT(*) AS pantry_item_rows, COUNT(DISTINCT user_id) AS users_with_items FROM pantry_items;` No writes. Credentials were not printed.
- Result: **206** `pantry_items` rows, **2** users with items.

206 is just over the ~200 bar, so the approved line **“Hundreds of items tracked”** may be used. If a later count falls under ~200, switch to the softer line: “Tracking pantry items for households across the country.” Do not invent a more precise public number than “hundreds.”

### Approved public wording (not live yet — no product-code change in this ticket update)

- “Used by households across the country”
- “Hundreds of items tracked”

Current live/repo proof still uses “Built by a home cook for real pantries,” “Looks up 3M+ products” (Open Food Facts catalog size, not Pantry Hub’s own item count), and does not yet use Tylor’s two lines. A later code change should add those lines and keep review / `aggregateRating` schema **entirely removed**.

### Expiration tracking is not on the roadmap

**Hard rule:** expiration tracking, expiry dates, “expiring soon,” and similar claims must not appear in marketing copy, FAQs, schema, or directory blurbs. Do not imply the app tracks waste via expiry.

Live and repo homepage still have this Smart Analytics line, which must be removed or rewritten in the same copy pass:

> Track usage patterns, identify waste, and get insights on your household consumption.

That is a waste/expiry-adjacent claim. Rephrase to shipped behavior only (for example usage patterns or shopping lists from low stock). Dashboard “Expiring Soon” / “Expired” filters are not a marketing feature.

### Follow-up acceptance

- [ ] Homepage (and any other public surface) uses “Used by households across the country” and “Hundreds of items tracked” (or the softer line if a new count is under ~200)
- [ ] Review / `aggregateRating` JSON-LD stays completely absent
- [ ] No expiration, expiry, “expiring soon,” or “identify waste” claims remain on the marketing site
- [ ] This follow-up is product copy only after this ticket update; implement via the usual code path, do not sneak it into a tickets-only commit

## Follow-up implementation (2026-11-25, SEO desk overnight sweep)

- Hero proof row now uses Tylor's two approved lines: "Used by households across the country" and "Hundreds of items tracked" (based on the 206-row count above; re-count read-only before merge if it may have dropped under ~200). Dropped the "Looks up 3M+ products" point to keep four cards.
- Smart Analytics card → "Usage History": "See what your household used and when, so restocking starts from what is running low." No "identify waste" or expiry wording remains on marketing pages.
- No review / `aggregateRating` markup (PP-106 confirmed none).
- Sitemap home `lastModified` bumped to 2026-11-25 for this copy change.
- Local `next start` HTML: both approved lines present once; 0 hits for identify waste, expir*, aggregateRating, 50,000, thousands of households, App Store.
