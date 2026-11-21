# PP-076: Quick Scan mode on the Scan Barcode screen

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported enhancement  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  
**Depends on:** PP-075 (manual-name first-letter fix, already on this branch)

---

## Problem

On the Scan Barcode screen, a recognized barcode still shows a preview card that requires clicking "Add to Inventory" before the item is added and the camera can continue. Tylor: "I want to scan, it gives a toast that it was added or something and I keep scanning. Having to click this add to inventory every time is a pain."

## Behavior

Add a visible **Quick Scan** toggle on the Scan Barcode screen. Remember the choice (e.g. localStorage).

When Quick Scan is **on**:
- A recognized barcode is added to inventory immediately (qty +1 if the item already exists — use the existing `handleSaveScannedProduct` add/increment logic; do not invent a second path).
- Show a brief toast like `Added French Style Green Beans`.
- The camera keeps scanning so the user can go to the next item without a confirm tap.
- Debounce so the same barcode is not double-added within ~2–3 seconds.
- Unknown barcodes (no product match) still need a name: pause scanning, show the manual-name entry (PP-075 first-letter bug must stay fixed), then resume scanning after the name is saved.

When Quick Scan is **off**:
- Keep the current confirm-card flow (preview, then Add to Inventory / Scan Again).

Default the toggle to **on** for first-time visitors so the flow Tylor asked for is the starting experience; persist later changes.

## Acceptance Criteria

- [x] Visible Quick Scan toggle on the Scan Barcode screen
- [x] Choice is persisted (e.g. localStorage) and restored on revisit
- [x] Quick Scan on: recognized barcodes auto-add, show a brief "Added {name}" toast, camera keeps scanning
- [x] Existing item with the same barcode/name increments quantity via existing save logic
- [x] Same barcode is not added twice within ~2–3 seconds
- [x] Unknown barcodes pause for manual name entry (full name, commit only on explicit submit/Enter); scanning resumes after save
- [x] Quick Scan off: confirm-card flow still works
- [x] Tests cover toggle persistence, auto-add + toast for a known product, debounce, and unknown-name pause
- [x] `npm run check` passes

## Implementation notes

- `BarcodeScanner.tsx` now accepts `quickScan`/`onQuickScanChange` props, renders a visible Quick Scan toggle, and immediately calls `onBarcodeDetected` for camera-detected known products when Quick Scan is ON, then resumes scanning after a ~3 s same-barcode debounce window.
- Manual "Type Barcode" and image uploads keep the existing confirm-card flow regardless of Quick Scan state, so the user still reviews intentionally entered barcodes.
- Unknown barcodes always pause for the existing manual-name input (PP-075 first-letter fix unchanged) and resume after the product is confirmed.
- `scan-barcode-view.tsx` owns the `quickScan` state, defaults it to `true` via `localStorage.getItem("pantry-quick-scan") !== "false"`, and persists changes back to `localStorage`.
- Tests added/updated in `frontend/tests/barcode-scanner.test.tsx` and `frontend/tests/scan-barcode-view.test.tsx` cover the toggle, persistence, Quick Scan ON/OFF behavior, debounce, and unknown-name pause.

## Out of scope

- Receipt/usage scanners
- Backend barcode lookup changes
- Deploy (Remy will deploy after review)

## Notes (non-binding context)

`scan-barcode-view.tsx` already auto-saves and shows a scan toast, and already has a 3s same-barcode debounce, *once* `onBarcodeDetected` fires. `BarcodeScanner.tsx` currently stops the camera and shows an "Add to Inventory" preview card first, which is the likely source of the extra tap. Investigate and implement the real fix; do not assume this diagnosis is complete. Reuse existing add/toast/debounce pieces where they already work. Do not break the PP-075 manual-name fix.
- Review follow-up: `quickScanRef` and `lastCameraScanRef` so toggling mid-session and the 3s same-barcode debounce are not lost to a stale `startScanning` closure. Scan toast copy is `Added {name}`. Camera-path tests added in `barcode-scanner.test.tsx`.
