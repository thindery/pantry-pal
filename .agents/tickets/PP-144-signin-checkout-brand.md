# PP-144: Sign-in and checkout brand + contrast

**Status:** ✅ Done (overnight 2026-11-25, PR #75, merge 6cfa7de)
**Priority:** P1
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-25
**Depends on:** PP-142 (checkout button color)
**Blocks:** —
**Doc:** `.agents/docs/design-review-2026-11-22.md`

---

## Problem

Sign-in is a generic centered card: no brand mark, no path back to the marketing site, no Privacy / Terms, and no “Free to start — no credit card” reassurance. The empty emerald-to-slate gradient does not match the cream marketing pages.

Checkout success is an emoji party on `emerald-600` (body text 3.77:1). Checkout cancel is a sad-emoji navy screen. Neither uses the mark, Lora, or the token palette, and success auto-redirects in 5 seconds.

## Behavior

- Sign-in: show `BrandMark`, a “Back to home” (or logo) link, Privacy and Terms under the Google button, and a short free-plan line. Keep Google as the only sign-in method.
- Checkout success and cancel: same tokens and typography as the rest of the site (no emoji full-bleed). Body text and buttons meet AA. A clear primary button; auto-redirect is optional but should be announced and not the only way forward.
- Titles / noindex for these routes stay with PP-103.

## Acceptance Criteria

- [x] Sign-in shows the Pantry Hub mark and links to home, Privacy, and Terms
- [x] Checkout success and cancel use brand tokens; text contrast ≥4.5:1
- [x] No emoji as the primary visual on those screens

## Out of scope

- Adding email/password auth
- PP-103 metadata
- Do not `git add -A`. Do not commit `2026-07-30`.
- If `CheckoutResult.tsx` is mid-edit by another worker, implement sign-in first and leave checkout for a follow-up commit.

## Progress

- [x] Sign-in mark, back link, Privacy/Terms, and “free to start” line (2026-11-22 design-review pass)
- [x] Checkout success/cancel: restyled with brand tokens, BrandMark, Lora headings, Lucide icons, no emojis, AA contrast, and /pricing link.
