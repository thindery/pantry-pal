# PP-145: Desktop Pantry layout and 44px icon targets

**Status:** ✅ Ready for review
**Priority:** P2
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-25
**Depends on:** —
**Blocks:** —
**Doc:** `.agents/docs/design-review-2026-11-22.md`

---

## Problem

On a 1440px desktop, Pantry’s “Scan item” and “Add manually” buttons are a two-column grid across `max-w-5xl`, so they stretch into large banners. The page title repeats “Pantry Hub” under the already-visible wordmark in the top nav. The settings gear on Pantry and Shopping is smaller than a 44×44 target (`p-1.5` + 18px icon). “Back to Inventory” on Add item is `text-slate-400`.

## Behavior

- From `md` up, Scan / Add are a compact button group (auto width or a modest max width), not full-bleed banners.
- Use “Pantry” (or no duplicate wordmark) as the inventory screen title on desktop.
- Standalone icon buttons (settings, and similar close/back controls) meet a 44×44 minimum target.
- Darken the Add-item back link to `--muted` or `--foreground`.

## Acceptance Criteria

- [x] At 1440px, Scan and Add are compact and aligned with the list, not stretched edge-to-edge
- [x] The inventory title does not repeat the full wordmark under the desktop nav
- [x] Settings gears are at least 44×44

## Implementation Notes

- `frontend/components/dashboard/views/inventory-view.tsx`:
  - From `md` up, Scan item and Add manually buttons use `md:flex md:w-auto`, remaining compact and aligned with the list while keeping mobile `grid grid-cols-2`.
  - Desktop title text renders "Pantry" (`hidden md:inline`) under the desktop nav while keeping mobile title text (`md:hidden`).
  - Settings button upgraded to 44×44 (`min-h-11 min-w-11 h-11 w-11 inline-flex items-center justify-center`).
- `frontend/components/dashboard/views/shopping-list-view.tsx`:
  - Settings button upgraded to 44×44 (`min-h-11 min-w-11 h-11 w-11 inline-flex items-center justify-center`).
- `frontend/components/dashboard/ThresholdSettingsModal.tsx`:
  - Close button upgraded to 44×44 (`min-h-11 min-w-11 h-11 w-11 inline-flex items-center justify-center`).
- `frontend/components/dashboard/views/add-item-view.tsx`:
  - "Back to Inventory" link updated to `text-[var(--muted)] hover:text-[var(--foreground)]`.
- `frontend/tests/desktop-pantry-layout.test.tsx`:
  - Added test coverage verifying the desktop title text, 44×44 icon buttons, compact button group, and tokenized link colors.

## Out of scope

- Token changes (PP-142)
- Do not `git add -A`. Do not commit `2026-07-30`.
