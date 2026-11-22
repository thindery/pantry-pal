# PP-086: Compact camera controls and wrapping session names

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported follow-up to PP-084
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** PP-084 (fixed-height scan camera + visible ledger)

---

## Problem

Tylor after PP-084: the red “Stop Scanning” pill and flashlight button are way too big, centered over the bottom of the camera and overlapping the green scan frame. The hint “Point at a barcode · Tap to focus” is cut off by the top edge of the frame. Session ledger names also truncate (“Beefaroni Pasta in Tomat…”).

## Behavior

- Stop/Start and torch are ~36px round icon buttons, stacked vertically, pinned to the top-right of the camera, on a semi-transparent dark background. Accessible names stay “Start scanning”, “Stop scanning”, and “Toggle flashlight”.
- Hint text is a small pill at the top-left of the camera, clear of the frame and the side buttons.
- The green scan frame is inset so it has margin and does not overlap the hint or controls, including at the 200px minimum camera height.
- Ledger product names wrap to 2 lines (`line-clamp-2`). −/+ buttons are ~32px so the name gets more width.
- The scan page is locked to the viewport (`100dvh` minus the bottom nav and safe area) with overflow hidden, and body/html scrolling is disabled while on this page. The camera stays a fixed height at the top; only the session list scrolls (`flex: 1; min-height: 0; overflow-y: auto`).
- Match the scan route with or without a trailing slash (the app uses `trailingSlash: true`, so a strict `/dashboard/scan-barcode` check never applied the height lock — that is why the whole page scrolled once the list grew).
- A chevron in the “This session” header (next to Clear) expands the list to full height, pausing and collapsing the camera to a thin bar, and collapses back to show the camera.

## Acceptance Criteria

- [x] Ticket + status row for PP-086
- [x] Camera controls are compact icons at the top-right; hint is a top-left pill clear of the frame
- [x] Session names wrap to 2 lines; −/+ are ~32px
- [x] Scan page is viewport-locked; only the session list scrolls; expand/collapse chevron works
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
