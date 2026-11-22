# PP-087: Barcode lookup fallback when Open Food Facts is down

**Status:** ✅ Done
**Priority:** P0
**Phase:** Production incident
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** existing product_cache + `/api/barcode/{code}` lookup

---

## Problem

Tylor: everything scanned is unknown, including apple cider vinegar (`074305001161`). Backend logs show `GET /api/barcode/074305001161` returning 404 (not 401). Open Food Facts (homepage and API) is timing out from multiple networks. Our lookup used only OFF with a 10s timeout and no fallback, so every cache miss became “unknown.”

## Behavior

- Serve `product_cache` first (including 12- and 13-digit UPC/EAN variants of the same code).
- Call Open Food Facts with a ~4s timeout and a proper User-Agent. Do not cache timeouts or HTTP failures as “not found.”
- If OFF fails, times out, or does not find the product, fall back to the UPCitemdb free trial endpoint (`https://api.upcitemdb.com/prod/trial/lookup?upc=`, no key). Map title, brand, image, and category, and cache successful fallback hits.
- Verify `074305001161` resolves (Bragg organic apple cider vinegar).

## Acceptance Criteria

- [x] Ticket + status row for PP-087
- [x] OFF timeout is short; UPCitemdb fallback is used and cached on success
- [x] Timeouts are not stored as not-found
- [x] `074305001161` looks up successfully
- [x] Frontend build/backend checks pass
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
