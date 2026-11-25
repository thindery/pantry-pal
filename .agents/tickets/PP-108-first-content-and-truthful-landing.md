# PP-108: First public content set and truthful landing (Quick Scan, receipts, screenshots)

**Status:** ✅ Done — merged 2026-11-25 and deployed (0cc57ed); live smoke passed (screenshot item still open)
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:26 PM America/Chicago — expiry is not on the roadmap
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
- **Expiration tracking is not on the roadmap** (Tylor, 2026-11-22, 4:26 PM CT). It must not appear in marketing copy, new pages, FAQs, or schema — not as a current feature and not as “coming soon.” Do not write food-waste articles that imply Pantry Hub tracks expiry or “identifies waste.”

## Acceptance Criteria

- [ ] Homepage H1 and feature copy describe shipped capabilities; Quick Scan is mentioned
- [ ] At least one real product screenshot with descriptive alt text is on the marketing site
- [ ] At least two new indexable how-to or feature pages are live, self-canonical, in the sitemap, and linked from the home or footer
- [ ] New pages do not claim voice/Gemini, App Store ratings, invented user counts, expiration tracking, or “identify waste”
- [ ] Existing homepage Smart Analytics copy “identify waste” is removed or rewritten (still live as of 2026-11-22 4:30 PM CT)

## Implementation (2026-11-25, SEO desk overnight sweep)

- Homepage H1 "Smart Inventory & Ledger for Your Home" → "Scan Groceries Into Your Pantry"; hero copy and meta description name Quick Scan and receipt scanning.
- Feature grid: "AI Receipt Scanning" → "Receipt Scanning" (OCR, confirm before adding), "Barcode Scanning with Quick Scan", "Inventory Ledger" → "Pantry List", Household Sharing drops "real-time" and states Family = up to 5 members. Site/OG descriptions drop "AI-powered" and "alerts".
- New indexable pages (self-canonical, in sitemap with lastmod 2026-11-25, linked from the marketing footer on every marketing page): `/guides/barcode-scanning/` (Quick Scan, confirm mode, unknown barcodes, lookup order cache → Open Food Facts → UPCitemdb, tips) and `/guides/receipt-scanning/` (Tesseract OCR, Confirm & Add All, Free 5/month vs unlimited, tips). Facts taken from PP-076/080/081/087/088, `receipt_ocr.py`, `receipt-scanner.tsx`, and `TIER_LIMITS`.
- No voice/Gemini, ratings, user counts, expiry, or "identify waste" on the new pages (checked in built HTML).
- Tests: typecheck ✅, lint 0 errors, 29 files / 189 tests ✅ (indexation test updated to 6 sitemap URLs), build ✅. Local `next start`: both guides 200 with own canonical/og:url, no-slash variants 301, `/guides/` 404 noindex, home links both guides, sitemap has 6 URLs.
- **Still open:** a real product screenshot (scan session, pantry list, or shopping list) with alt text. Needs a capture from a real or demo account; no screenshot was faked.
