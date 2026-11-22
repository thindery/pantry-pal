# PP-082: Single top image toast in Quick Scan

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported enhancement  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  
**Depends on:** PP-081 (Quick Scan session ledger)

---

## Problem

Tylor: scanning works well, but Quick Scan shows two toasts. A green text toast (`✓ Added 1 unit to …`) is pinned at the top and overlaps the Scan Barcode header. A dark card with the product image appears near the bottom and is partly hidden by the bottom nav. He prefers the image toast, at the top, and only one toast.

The green toast comes from `success()` inside `handleSaveScannedProduct`. The dark card is the Quick Scan image toast, currently `fixed bottom-4`. The "This session" list is the ledger, not a toast.

## Behavior

- In Quick Scan, show a single toast: product image, name, and session count.
- Place it at the top of the screen (safe-area aware), not covering the bottom nav, and not as a second stacked banner over the header plus a bottom card.
- Do not fire the global green `success()` toast for Quick Scan adds (including + and unknown-name saves).
- Normal (non-Quick Scan) mode can keep the existing green success toast; do not also show the image toast there.
- Keep the session ledger and PP-080/PP-081 behavior otherwise unchanged.

## Acceptance Criteria

- [x] Ticket + status row for PP-082
- [x] Quick Scan add shows one top image toast (image + name + count)
- [x] Global green success toast is not shown for Quick Scan adds
- [x] Toast is not `fixed bottom` under the nav
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
