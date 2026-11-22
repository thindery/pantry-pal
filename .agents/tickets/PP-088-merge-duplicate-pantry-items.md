# PP-088: One pantry row per product, with quantity summed

**Status:** ✅ Done
**Priority:** P0
**Phase:** User-reported bug
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** Quick Scan / barcode save (PP-076, PP-081, PP-087)

---

## Problem

Tylor: “For some reason multiple items have open line instead of qty 2 or whatever.” The pantry list showed the same product as separate 1-unit rows (Chunk Light Tuna, Green Chiles Refried Beans, Best Choice Lemon Cake Mix, Butter cake, and others). Some rows had slightly different images.

Root cause: `POST /api/barcode/{code}` and `POST /api/items` always inserted a new `pantry_items` row. The frontend tried to increment when it already had a matching row in memory, but the match was exact-barcode only, and two fast scans of a new product both missed that check. There was no unique constraint on `(user, barcode)`.

## Behavior

- Future scans and adds increment the existing item for that user and barcode (including UPC-A / EAN-13 variants), or for the same normalized name and category when there is no barcode.
- Concurrent scans cannot create two rows (advisory lock + unique indexes).
- Existing production duplicates are merged: same user + same barcode, or same normalized name + category when there is no barcode. Quantities are summed and the oldest row is kept. Same name with different barcodes is left alone when they are distinct products.
- Affected rows are backed up on the Mini before the merge.

## Acceptance Criteria

- [x] Ticket + status row for PP-088
- [x] Scan/add increments an existing item; race-safe for repeated scans
- [x] Prod duplicates merged after a Mini backup; merge count reported
- [x] Same-name different-barcode products left alone when they are distinct
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
