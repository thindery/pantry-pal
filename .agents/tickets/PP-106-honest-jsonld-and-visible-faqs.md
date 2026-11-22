# PP-106: Honest, valid JSON-LD and FAQ answers present in the HTML

**Status:** 📋 Open
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
