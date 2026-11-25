# PP-149: E2E — barcode scan including Quick Scan

**Status:** ✅ Done (overnight 2026-11-25, PR #95, #96, merge 28fe947)
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

## Progress Notes

- 2026-11-25 overnight (Pantry Hub Lead): `e2e/barcode-scan.spec.ts` (normal mode, "Type Barcode" path, PP-150 test session + API stand-in). Covers a product_cache hit (Cached badge), an Open Food Facts hit and a UPCitemdb fallback (as the backend reports them, Live badge), and a total miss with manual name entry (Add disabled until a name is typed). Each is added through `POST /api/barcode/{code}` and shows on `/dashboard/`. Direct Open Food Facts / UPCitemdb calls are blocked and asserted absent. Quick Scan: toggling it on hides the manual/image fallbacks and persists `pantry-quick-scan`. Found and fixed PP-173 (hydration error) on the way.
- Still open: a Quick Scan camera add (ledger + toast) needs a camera fixture (fake media stream with a barcode video, or a decode hook). The backend fallback order itself is covered by tests/test_barcode.py, not this spec.
- 2026-11-25 overnight, part 2: `e2e/quick-scan-camera.spec.ts` drives Quick Scan with a fake Chromium camera. `e2e/support/fake-camera.ts` writes a Y4M video of EAN-13 0012345678905 at test time (no binary fixture in git). The decoded barcode hits the mocked lookup, the product is added with no confirm step, and the session ledger and toast region show it. Stable across 4 repeats. All PP-149 assertions are now covered on the frontend; backend fallback order stays in tests/test_barcode.py.
