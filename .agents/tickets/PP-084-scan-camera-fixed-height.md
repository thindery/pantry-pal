# PP-084: Fix oversized Scan camera hiding the session ledger

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported regression
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** PP-083 (compact Scan header + pinned ledger)

---

## Problem

Tylor after PP-083 (`bd30e06`): the slim header looks great, but the camera box now fills the whole screen — from the header down under the bottom nav. The “This session” panel is not visible at all, not even the empty placeholder. “Scanner can be shorter.”

Likely causes: the camera used `flex-1` (and a video with a tall intrinsic portrait size, so the flex item’s `min-height: auto` would not shrink). Combined with `overflow: hidden` clipping to the padding box of a `100dvh` shell, the ledger was pushed into or past the fixed bottom nav and clipped.

## Behavior

- Camera is a **fixed** height of `clamp(200px, 33dvh, 300px)` (~32–35dvh, min 200px, max 300px). It must not flex-grow.
- The video is `object-fit: cover` and absolutely positioned inside that box so intrinsic video height cannot stretch the layout.
- The “This session” ledger sits directly below the camera, `flex: 1; min-height: 0; overflow-y: auto`, and stays visible when empty.
- The scan column must end **above** the bottom nav (nav chrome + safe area). Do not use padding-box overflow to “reserve” nav space — size the shell to `100dvh` minus nav/safe-area so clipping happens above the nav.
- Keep the slim header, Quick Scan toggle, optimistic +/−, and the top image toast.

## Acceptance Criteria

- [x] Ticket + status row for PP-084
- [x] Camera is a short fixed-height box; session ledger is visible below it, including the empty placeholder
- [x] Layout ends above the bottom nav on mobile viewports (~390×844 and ~412×915)
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
