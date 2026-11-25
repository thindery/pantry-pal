# PP-106: Honest, valid JSON-LD and FAQ answers present in the HTML

**Status:** 🔍 In review (PR, branch seo/PP-106-honest-jsonld-faq; not deployed)
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-101 (ratings), PP-102 (feature list), PP-104 (logo/screenshot URLs)
**Blocks:** Safe rich results / answer-engine citations
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

Live JSON-LD is incomplete or inaccurate:

- `SoftwareApplication.aggregateRating` 4.8 / 50,000 ratings (see PP-101)
- `operatingSystem` is “Web, iOS, Android” for a web app with no App Store / Play listing
- Organization `logo` and SoftwareApplication `screenshot` 404
- `WebSite.potentialAction` SearchAction targets `/search?q=…`, which redirects to sign-in
- FAQPage has five questions; only the first answer is in the FAQ HTML. Answers 2–5 are in JSON-LD only until the client accordion is opened (`LandingPage.tsx` is a client component and omits closed answers from the DOM). That fails a character-for-character visible-FAQ match and risks FAQ rich-result rejection.

## Behavior

- Schema must describe the shipped product only (web app unless native apps exist; real offers for Free $0, Pro $4.99, Family $7.99 are fine).
- Remove SearchAction until a real public search page exists.
- Logo and screenshot URLs must 200 as images.
- Every FAQ question and answer in JSON-LD must appear in the page HTML even when the accordion is collapsed (render the answer in the DOM; CSS/aria can hide it). Visible text and JSON-LD text must match exactly.
- Do not add Review or AggregateRating markup without real reviews.

## Acceptance Criteria

- [ ] No unverifiable aggregateRating / review markup
- [ ] SoftwareApplication OS and features match the shipped product
- [ ] Logo and screenshot URLs 200
- [ ] No SearchAction (or it targets a working public search)
- [ ] All FAQ answers are present in the initial HTML and match JSON-LD character for character

## Implementation (2026-11-25, SEO desk overnight sweep)

- `LandingPage.tsx`: every FAQ answer is rendered in the initial HTML; closed answers use the `hidden` attribute only. FAQ answers rewritten to match shipped behavior (Tesseract OCR with review before save, Free 5 scans/month and 50 items from `TIER_LIMITS`, Family up to 5 members, cancel → Free plan). Removed "advanced AI", "real-time", "read-only mode", "export your inventory as CSV", and "we never delete your data" (none verifiable in code).
- `SchemaMarkup.tsx`: `operatingSystem: "Web"`, feature list and description match shipped features, no `SearchAction`, `screenshot` → `/og-image.png` and Organization `logo` → `/logo.png` (both 200 after PP-104). No Review/AggregateRating markup anywhere.
- Tests: `tests/landing-faq-honesty.test.ts`. Local `next start` HTML check: JSON-LD types Organization, WebSite, SoftwareApplication, FAQPage; FAQ question + answer visible match **5/5 character for character**; no aggregateRating, no SearchAction.
