# PP-146: Refresh /design-system to the shipped UI and brand guide

**Status:** 📋 Open
**Priority:** P2
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:55 PM America/Chicago
**Depends on:** PP-142
**Blocks:** —
**Doc:** `.agents/docs/design-review-2026-11-22.md` §6
**Related:** PP-072 (gate or remove this route in production)

---

## Problem

`/design-system` is still the PP-042 “proposed” handoff: bulky shopping rows, inventory rows without the current thumbnails, and the old token list. The live app (PP-085, PP-116) and the 2026-11-22 brand guide proposal have moved on. The page is noindex but still public (PP-072).

## Behavior

- Update the page to show the shipped compact inventory and shopping rows, current tab bar, tokens including `--primary-bright` vs `--primary`, type scale, radii, and icon rules from the design-review brand guide.
- Keep it noindex. Optionally restrict it to admin (PP-072) once the reference is updated, or do that in PP-072.

## Acceptance Criteria

- [ ] `/design-system` matches the shipped compact rows and the new token names
- [ ] `robots` remains `noindex, nofollow`

## Out of scope

- Building a new token platform or Storybook
- Do not `git add -A`. Do not commit `2026-07-30`.
