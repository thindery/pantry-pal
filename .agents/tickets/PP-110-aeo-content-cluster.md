# PP-110: AEO content cluster and comparison pages

**Status:** In Review (PR open 2026-11-25)
**Priority:** P2
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:26 PM America/Chicago — expiry is not on the roadmap
**Depends on:** PP-108 (first pages and truthful landing), PP-101–PP-106 (honesty + schema)
**Blocks:** —
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)
**Supersedes (for remaining work):** unfinished ideas in REMY-613 / REMY-616. Do not mark those July tickets “still done” for blog infrastructure they never shipped.

---

## Problem

Competitors and roundup sites already publish “best pantry inventory app,” barcode-scanner comparisons, and waste/expiry guides. Pantry Hub has no answer-style pages, no comparisons, and no blog. FAQ coverage is thin and four of five answers are missing from the HTML (PP-106).

Volumes are unknown; do not invent them. Target questions are qualitative (see the audit): barcode pantry inventory, failed/wrong barcode matches, receipt vs barcode vs manual entry, household sharing, free-tier limits, and comparisons with Pantry Check, NoWaste, Grocy, and KitchenPal.

## Behavior

- Expand visible FAQs (all answers in HTML) with questions people actually ask, including an honest “is there a native iOS/Android app?” (mobile web) and “what if a barcode is not found?”
- Add one careful comparison page at a time, only claiming shipped features. Name collision note: a different product is called Pantry Pal — always say Pantry Hub in public copy.
- **Expiration tracking is not on the roadmap** (Tylor, 2026-11-22, 4:26 PM CT). Do not publish “how Pantry Hub tracks expiration dates” or food-waste guides that imply the app identifies waste or tracks expiry. Comparison pages must not list expiry as a Pantry Hub feature. A general education article is not worth doing if it would be read as a product claim.
- If a blog is added, use Article/Breadcrumb schema, unique titles, and sitemap inclusion with real lastmod. Quality over a 2-posts-per-week calendar.
- Internal-link the cluster from the homepage, footer, and related guides.

## Acceptance Criteria

- [ ] At least one comparison page and one additional answer-style guide are live, accurate, and internally linked
- [ ] No invented search volumes, ratings, or competitor prices unless cited from a page opened at write time
- [ ] No unshipped features (voice, native apps) and no expiration / “identify waste” claims, even as roadmap copy
- [ ] FAQ / schema on new pages matches visible text character for character

## Implementation (2026-11-25, overnight SEO sweep)
- `/guides/pantry-hub-vs-grocy/`: honest comparison table (Grocy facts from grocy.info, v4.7.1, read 2026-11-25). No expiry claims for Pantry Hub.
- `/guides/barcode-vs-receipt-vs-manual/`: answer-first entry-method guide.
- Home FAQ +2 (mobile app / barcode not found), 7/7 JSON-LD == visible text.
- Sitemap 8 URLs, footer links, middleware public paths.
- Tests: typecheck ok, lint 0 errors, vitest 189/189, next build ok, local 200 + self canonicals.
