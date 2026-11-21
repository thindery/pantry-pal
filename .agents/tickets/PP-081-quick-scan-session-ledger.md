# PP-081: Quick Scan running session ledger

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported enhancement  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  
**Depends on:** PP-076 (Quick Scan), PP-080 (scanner reliability)

---

## Problem

Tylor: in Quick Scan / quick-add mode, the scan screen should keep a running ledger of what was just scanned so he can easily tap + or − to adjust an item he just added. Upload Image and Type Barcode are not needed in Quick Scan (keep them in normal mode).

## Behavior

When Quick Scan is **on**:

- Show a compact running session list on the scan screen (newest on top). The most recently scanned (or bumped) row is highlighted.
- Each row: product name (barcode if no name), quantity added this session, and large thumb-friendly + / − buttons that update real inventory via the existing APIs.
- Scanning the same barcode again increments that row instead of adding a duplicate.
- − down to 0 removes the session row and subtracts only what this session added. Never go negative.
- Keep the existing "Added {name}" toast.
- Hide **Upload Image** and **Type Barcode** (including the camera-denied shortcuts). They remain available when Quick Scan is off.
- Keep the list compact so the camera stays usable on a phone.
- The session list clears when leaving the scan screen, or via a small Clear button (clears the list only; does not undo inventory).

When Quick Scan is **off**: confirm-card flow, Upload Image, and Type Barcode stay as they are.

Do not break PP-075 manual name entry for unknown camera scans, or the PP-080 scanner reliability work.

## Acceptance Criteria

- [x] Ticket + status row for PP-081
- [x] Quick Scan shows a session ledger, newest on top, latest row highlighted
- [x] + / − update inventory; same barcode bumps one row; − to 0 removes the row; quantity never goes negative
- [x] Toast still appears on a successful add
- [x] Upload Image and Type Barcode are hidden in Quick Scan and visible when it is off
- [x] Unknown camera-scan name entry still works
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy

## Out of scope

- Receipt / usage scanners
- Changing backend APIs
- Undo-all / reverting inventory on Clear
