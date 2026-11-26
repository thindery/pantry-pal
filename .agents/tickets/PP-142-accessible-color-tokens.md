# PP-142: Accessible color tokens (primary / accent / danger split)

**Status:** ✅ Done (live; in every deploy since db0ef3e)
**Priority:** P1
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:55 PM America/Chicago
**Depends on:** —
**Blocks:** AA text on every primary, upgrade, and danger button
**Doc:** `.agents/docs/design-review-2026-11-22.md` §3.2 and §6

---

## Problem

`--primary` is `#7cb342`. White text on that green is 2.50:1 (fails AA and even large-text AA). The same green is used as text on cream (hero “Home,” “View full pricing details,” 2.46:1) and on `--primary-light` (selected chips, shopping “+ Add item,” 2.23:1). Account “Upgrade” is white on `#f59e0b` (2.15:1). Danger fills are 3.67:1.

The bright kitchen green is a good brand color for the logo field and washes. It is not a legal text or button-label color.

## Behavior

- Split tokens in both `frontend/lib/design-tokens.ts` and `frontend/app/globals.css` (keep them in sync):
  - `--primary` `#2e7d32` (or equivalent that is ≥4.5:1 with white *and* with `--primary-light`)
  - `--primary-hover` `#1b5e20`
  - `--primary-bright` `#7cb342` — logo, decorative icons, washes only
  - Accent fill `#b45309`; keep `#f59e0b` as `--accent-bright` if needed
  - Danger fill `#e11d48` or another ≥4.5:1-with-white red
- All solid primary / accent / danger buttons, marketing CTAs, selected chips, and primary-colored text use the AA tokens. Do not use white type on `--primary-bright` or `--accent-bright`.
- Recompute the contrast table in the design-review doc or add a small unit test if one already exists for tokens.

## Acceptance Criteria

- [ ] White text on `--primary`, `--accent`, and `--danger` button fills is ≥4.5:1
- [ ] Primary-colored text on cream and on `--primary-light` is ≥4.5:1
- [ ] The chef-hat mark can still use the bright green
- [ ] `design-tokens.ts` and `globals.css` stay in sync

## Out of scope

- Pricing CTA copy (PP-141)
- Sign-in / checkout layout (PP-144)
- Do not `git add -A`. Do not commit `2026-07-30`.
