# PP-083: Compact Scan header and pinned session ledger

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported enhancement
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** PP-082 (Quick Scan toast + optimistic ledger)

---

## Problem

Tylor: the Scan Barcode screen wastes a lot of space on the title and toggle. On a phone, Back to Inventory, a large centered “Scan Barcode” title, the “Point camera at a barcode…” subtitle, and a Quick Scan toggle on its own row take ~250px before the camera. With an empty session list there is also a large empty gap below the camera, above the bottom nav.

Follow-up: keep the session list fixed at the bottom so it is always there, but scrollable.

## Behavior

- Collapse the header into one slim row (~44–48px): back arrow (←) on the left (accessible name still “Back to Inventory”), a small “Scan” title, and a compact Quick Scan toggle with a small label on the right.
- Remove the subtitle (the camera overlay already hints to tap to focus). Reduce top padding.
- Full-height scan screen (`100dvh` minus the bottom nav): slim header, camera flex-fills the middle (taller than the old square aspect on mobile), “This session” ledger pinned at the bottom above the nav (safe-area aware via the existing shell padding).
- Ledger has a max height of ~40% of the viewport and scrolls internally. It stays visible when empty, with a small “Scanned items appear here” placeholder. The page itself should not need to scroll.
- Keep the session list behavior (optimistic +/−, Clear) and the top image toast working. Do not break PP-080–PP-082 or unknown-product name entry.

## Acceptance Criteria

- [x] Ticket + status row for PP-083
- [x] One slim header row: back arrow, “Scan”, compact Quick Scan toggle
- [x] Subtitle removed; camera uses leftover height (not a short square with a large gap below)
- [x] Session ledger is pinned at the bottom, always visible in Quick Scan (placeholder when empty), internally scrollable, max ~40vh
- [x] Page does not rely on document scrolling for this screen
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
