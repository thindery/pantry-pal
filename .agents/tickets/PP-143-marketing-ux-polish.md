# PP-143: Marketing UX — sticky-nav overlap, CTA weight, numeral contrast

**Status:** ✅ Done (pending deploy)
**Priority:** P1
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:55 PM America/Chicago
**Depends on:** PP-142 (for link/numeral color, or use the new `--primary` once it exists)
**Blocks:** —
**Doc:** `.agents/docs/design-review-2026-11-22.md`

---

## Problem

On the production homepage, the sticky header covers section titles when jumping to `#how-it-works` and `#faq` (“HOW IT WORKS” and “Frequently Asked” are clipped). The Free (and Family) pricing CTAs on the homepage are cream pills that look disabled next to the solid Pro button. “View full pricing details” and the large 01 / 02 / 03 numerals use the bright green and fail contrast.

## Behavior

- Add `scroll-margin-top` (about 6rem, enough for the 64px header plus breathing room) to `#features`, `#how-it-works`, `#pricing`, and `#faq`.
- Make “Get started free” look like an enabled button (outline or solid). Family should not look disabled.
- “View full pricing details” and How-it-works numerals use a contrast-safe color (`--primary` after PP-142, or ink).
- Do not rewrite the H1 or add product screenshots here — that is PP-108. Do not fix doubled titles — that is PP-103.

## Acceptance Criteria

- [ ] Anchor links to How it works and FAQ leave the section title fully visible under the sticky nav at 390 and 1440
- [ ] Homepage Free CTA does not look disabled
- [ ] “View full pricing details” and step numerals meet AA

## Out of scope

- `/pricing/` CTA logic (PP-141)
- Landing H1 “Ledger” and screenshots (PP-108)
- Do not `git add -A`. Do not commit `2026-07-30`.
