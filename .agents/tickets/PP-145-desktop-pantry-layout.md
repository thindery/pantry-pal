# PP-145: Desktop Pantry layout and 44px icon targets

**Status:** 📋 Open
**Priority:** P2
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:55 PM America/Chicago
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

- [ ] At 1440px, Scan and Add are compact and aligned with the list, not stretched edge-to-edge
- [ ] The inventory title does not repeat the full wordmark under the desktop nav
- [ ] Settings gears are at least 44×44

## Out of scope

- Token changes (PP-142)
- Do not `git add -A`. Do not commit `2026-07-30`.
