# PP-149: E2E — barcode scan including Quick Scan

**Status:** 📋 Backlog
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147, PP-148 (signed-in storageState)
**Blocks:** —
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove barcode add still works in normal and Quick Scan modes, including the lookup order (cache → Open Food Facts → UPCitemdb fallback), without a physical camera or live third-party calls in CI.

## User path

1. Sign in (PP-148 storageState) and open `/dashboard/scan-barcode` (`frontend/app/dashboard/scan-barcode/page.tsx`, UI in `frontend/components/dashboard/views/scan-barcode-view.tsx` and `frontend/components/BarcodeScanner.tsx`).
2. **Mock the camera** (Playwright can grant permissions and/or stub `getUserMedia`; prefer injecting a decode result or using the manual-entry / image-upload fallback so CI has no webcam). Do not hit a real device camera in the smoke suite.
3. **Mock lookup** at `GET /api/barcode/{barcode}` (`backend/routers/barcode.py` → `backend/services/barcode_service.py`). Production order is:
   1. local `product_cache` (`get_cached_product`, fresh then stale)
   2. Open Food Facts (`lookup_open_food_facts`, `https://world.openfoodfacts.org/api/v0/product`)
   3. UPCitemdb fallback (`lookup_upcitemdb`, `https://api.upcitemdb.com/prod/trial/lookup`)
   Frontend also has a parallel client helper in `frontend/services/barcodeService.ts`. Tests should mock both the API route and any direct client fallback so CI does not call those providers.
4. **Normal scan:** with Quick Scan off, look up a known test barcode, confirm the product name, and add it to the pantry (`POST /api/items` via `add_or_increment_item` in `backend/services/pantry_service.py` / `backend/routers/items.py`). Confirm the item appears in inventory at `/dashboard/`.
5. **Quick Scan:** toggle Quick Scan on (control in `BarcodeScanner`; preference persisted as `localStorage` key `pantry-quick-scan`). A known-product scan should add immediately, resume scanning, and show the session ledger (`data-testid="quick-scan-ledger"`) and the single-image toast region (`data-testid="quick-scan-toast-region"` / `data-testid="quick-scan-image-toast"`).
6. Cover a cache hit vs an uncached product that must fall through to the OFF mock, then a miss that falls through to the UPCitemdb mock. Cover a total miss (manual name entry still possible when Quick Scan is off).

## Assertions

- [ ] `/dashboard/scan-barcode` loads for a signed-in test user
- [ ] A mocked cache hit returns the cached product and can be added to the pantry
- [ ] A mocked Open Food Facts hit (empty cache) returns that product (`source` / name as provided by the mock)
- [ ] A mocked UPCitemdb hit (cache and OFF miss) returns the fallback product
- [ ] Quick Scan adds a known product without a confirm detour, updates the ledger, and shows the toast region
- [ ] With Quick Scan off, a miss still allows manual entry; Quick Scan hides the manual/image fallback (current UI)
- [ ] No live calls to Open Food Facts or UPCitemdb in CI; no real customer pantry is touched
- [ ] Added items show up on `/dashboard/` (InventoryView). `/dashboard/inventory` redirects there.

## Allowed paths

- `e2e/` (scan specs, fixture barcodes, route mocks)
- `playwright.config.ts` only if permissions or a project split are needed
- Minimal `data-testid` hooks on `BarcodeScanner` / `scan-barcode-view` if existing test ids are not enough
- Do not change lookup order or provider URLs as part of this test ticket

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.
