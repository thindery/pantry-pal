# PP-075: Barcode scan manual name commits after first letter

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported bug  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  

---

## Problem

On the Scan Barcode screen (`mypantryhub.com/dashboard`, "Point camera at a barcode to add an item"), when a scanned barcode has no product match (example: `070038626039`), the user must type a name manually. The name field only keeps the first letter and then saves/commits. The resulting card shows name `F`, category `OTHER`, with "Add to Inventory" / "Scan Again".

The field must let the user type the full name and only commit on explicit submit or blur — not on the first keystroke.

## Acceptance Criteria

- [x] For an unmatched barcode, the manual name input accepts the full typed name (multiple characters) without committing mid-typing
- [x] The scanned item is committed only on explicit submit (e.g. Enter / confirm button) or blur after a complete value — never after the first character
- [x] Existing matched-barcode / auto-add behavior for known items is unchanged
- [x] Add or update a unit/component test covering "type a multi-character name without mid-keystroke commit"
- [x] `npm run check` passes

## Out of scope

- Receipt/usage scanners
- Backend barcode lookup changes
- Deploy (Remy will deploy after review)

## Notes / hypothesis (non-binding)

**Actual root cause found:** In `frontend/components/BarcodeScanner.tsx`, the unknown-product name input was bound to `detectedProduct.name` and only rendered while `!detectedProduct.name`. Typing the first letter called `setDetectedProduct({ ...detectedProduct, name: e.target.value })`, which made the name truthy, unmounted the input, and left the card title as that first letter (e.g. "F") with Add to Inventory / Scan Again still showing.

Fix: keep a dedicated `unknownNameInput` buffer so `detectedProduct.name` stays empty while typing. The product is assembled and passed to `onBarcodeDetected` only on explicit submit (Add to Inventory or Enter). The parent modal in `scan-barcode-view.tsx` already used a local name buffer; it now also submits on Enter and clears any stale name when a new unknown scan arrives. Existing matched-barcode auto-add behavior is unchanged.

Likely files (verify):
- `frontend/components/BarcodeScanner.tsx`
- `frontend/components/dashboard/views/scan-barcode-view.tsx`
