# PP-108: First public content set and truthful landing (Quick Scan, receipts, screenshots)

**Status:** 📋 Open
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-101, PP-102, PP-103, PP-105 (so new pages 404-cleanly until they ship, then enter the sitemap)
**Blocks:** PP-110 deeper cluster; useful directory landing pages (PP-111)
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

The public site is a single feature-list landing page plus pricing and legal. There are no screenshots. The H1 leads with “Ledger,” which is internal jargon. Quick Scan and the recent barcode reliability work (PP-075–088) are not mentioned on the marketing surface. `/features`, `/about`, `/blog`, and `/guides` currently redirect to sign-in (until PP-105 404s them).

The site cannot rank or be cited for the questions people ask about pantry barcode scanning, receipt capture, or shopping lists, and the homepage does not show what the product actually looks like.

## Behavior

- Rewrite the landing H1 and feature grid around the shipped product (barcode / Quick Scan, receipt OCR, shopping lists, household plans). No unshipped expiry or voice claims.
- Add at least one real product screenshot (scan session, pantry list, or shopping list) with alt text.
- Ship a small set of indexable pages, linked from the home/footer, for example:
  - How barcode / Quick Scan works (unknown codes, review step, lookup fallback)
  - How receipt scanning works (Tesseract, Free-plan 5/month limit, review before save)
  - Optional short About / what’s included on Free vs Pro vs Family (if not fully covered on a now-self-canonical pricing page)
- Add those URLs to the sitemap only when they are live, with lastmod tied to real updates.
- Do not publish expiration-tracking or food-waste “our app does this” pages until that feature is real (dashboard “Expiring Soon” / “Expired” counts appeared hardcoded at 0 in this audit).

## Acceptance Criteria

- [ ] Homepage H1 and feature copy describe shipped capabilities; Quick Scan is mentioned
- [ ] At least one real product screenshot with descriptive alt text is on the marketing site
- [ ] At least two new indexable how-to or feature pages are live, self-canonical, in the sitemap, and linked from the home or footer
- [ ] New pages do not claim voice/Gemini, App Store ratings, user counts, or expiry tracking unless those are true at ship time
