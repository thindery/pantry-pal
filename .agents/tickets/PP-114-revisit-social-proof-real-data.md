# PP-114: Revisit social proof with real data

**Status:** 📋 Backlog
**Priority:** P2
**Phase:** SEO / AEO / marketing (follow-up to PP-101)
**Created:** 2026-11-22
**Depends on:** Real usage and first-party reviews (after PP-101)
**Blocks:** Review / AggregateRating JSON-LD, directory review badges
**Related:** PP-101 (fake proof removed), PP-111 (no public listings while proof was fake)

---

## Problem

PP-101 removed unverifiable social proof from the public site so the copy would stay legal. That work should be revisited later — with real evidence only — so the site can show genuine social proof again.

What PP-101 removed (do not put these back unless they are true and sourced):

- “Trusted by 50,000+ households”
- “50K+ Active Users”
- “2M+ Items Tracked”
- “99.9% Uptime”
- “4.8★ App Store Rating”
- “Join thousands of households…”
- Placeholder testimonials attributed to “Sarah M.,” “James K.,” and “Alex T.”
- `SoftwareApplication` `aggregateRating` of 4.8 with `ratingCount` 50000
- Unused `AggregateRatingSchema`
- Testimonial `itemProp` / `Review` markup

Replacement copy now on the landing page is true and non-numeric except for “3M+ products via Open Food Facts,” which is a claim about OFF’s public database (well above 3 million products), not Pantry Hub’s own user or scan counts.

## Behavior

- Collect real testimonials only with the person’s permission, using their real name or an agreed attribution. No invented quotes, stock photos, or composite “users.”
- Show real user, household, or scan counts only once the numbers are meaningful and can be measured from first-party data (and approved before they go public).
- Add `Review` / `AggregateRating` schema only for real, first-party reviews that are also visible on the page.
- Do not cite an App Store or Play Store rating unless Pantry Hub actually has that listing and the rating is current.
- Do not invent uptime, items-tracked, or “thousands of households” figures.

## Acceptance Criteria

- [ ] At least one real testimonial is on file with documented permission, or a written decision that testimonials are still not ready
- [ ] Any public count (users, scans, items, uptime) is sourced from first-party data and approved
- [ ] Review / AggregateRating JSON-LD is added only when visible reviews are real
- [ ] No removed fake claim from the PP-101 list has been restored without evidence
