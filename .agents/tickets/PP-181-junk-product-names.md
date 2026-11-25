# PP-181: Don't cache or serve 1–2 character product names

**Status:** ✅ Done (live 2026-11-25, 3:19 PM CT, build d70df3c, [PR #117](https://github.com/thindery/pantry-pal/pull/117))
**Priority:** P1 (customer-facing bad product identity; leftover data from PP-075)
**Phase:** User-reported bug
**Created:** 2026-11-25
**Depends on:** PP-075 (UI fix for first-letter commit; shipped Nov 21, data not repaired)
**Blocks:** —

---

## Problem

On 2026-11-25 Tylor opened Item Details for UPC `810035212374` on `/dashboard`. The item was named **"P"**, category Other, empty brand, placeholder image, 0 units, last updated 11/21/2026.

Root cause: the PP-075 bug. For an unmatched barcode, the unknown-name input was bound to `detectedProduct.name` and only rendered while that name was empty. The first keystroke unmounted the field and left a single letter (e.g. "P", "F") as the title. Clicking Add to Inventory then POSTed that letter as `manual_entry` into `product_cache` and `pantry_items`.

PP-075 fixed the input on 2026-11-21 at 4:40 PM CT, but:

- Junk cache rows were left in place.
- A cache hit younger than 60 days (including name `"F"`) was treated as a real product, so Quick Scan could auto-add it.
- Provider fallback to UPCitemdb (PP-087) only landed later on Nov 21, so July/afternoon-Nov-21 scans never got a second source.
- There was no backend guard against saving 1–2 character names.

## What the products actually are

- `810035212374`: Two Men and a Garden Sweet Heat Pickling Pouch 3.8oz. Open Food Facts: not found. UPCitemdb: full title + brand `TWO MEN AND A GARDEN`.
- `070038626039`: scanned as "F" (the example in the PP-075 ticket). Open Food Facts and UPCitemdb have no record. Left alone in the cache per the repair rule. (A third-party lookup site lists Best Choice Fire Roasted Diced Tomatoes, which is not one of our providers.)

## Behavior

- Do not cache or return a product whose name is empty, whitespace, 1–2 characters, or the "Unknown Product" placeholder.
- If the cache holds a junk name, skip it and ask providers. If a provider has a real name, refresh the cache and rename any pantry items for that barcode whose current name is still junk. User-typed names of 3+ characters stay put.
- If every provider misses or returns junk, respond with `needsName: true` and ask the user for a name rather than saving junk.
- POST `/api/barcode/{barcode}` rejects names shorter than 3 characters.
- The scan UI keeps the PP-075 typing fix and also blocks confirm / Enter until the typed name has at least 3 characters.

## Acceptance Criteria

- [x] `is_usable_product_name` / `isUsableProductName` reject 1–2 character names
- [x] Cached junk names are not treated as lookup hits
- [x] A short Open Food Facts name falls through to UPCitemdb
- [x] A successful provider refresh updates junk-named pantry items for that barcode
- [x] POST with name `"P"` is rejected (422)
- [x] Scanner and scan-view tests: typing "P"/"F" does not commit
- [x] `npm run test:backend` and the new frontend tests pass
- [x] Data repair: backup first; never delete rows

## Allowed paths

- `backend/services/barcode_service.py`
- `backend/routers/barcode.py`
- `backend/models/schemas.py`
- `tests/test_barcode.py`
- `frontend/lib/product-name.ts`
- `frontend/tests/product-name.test.ts`
- `frontend/components/BarcodeScanner.tsx`
- `frontend/components/dashboard/views/scan-barcode-view.tsx`
- `frontend/tests/barcode-scanner.test.tsx`
- `frontend/tests/scan-barcode-view.test.tsx`
- `.agents/tickets/PP-181-junk-product-names.md`
- `.agents/TICKET_STATUS.md`

Ban dependency churn unless required. Coding agents: no commits, pushes, or secrets. The Lead may commit, open one PR, merge, and deploy.

## Out of scope

- Recreating pantry items Tylor removed from the pantry on 2026-11-25
- Adding a new barcode provider
- Changing the 60-day cache TTL for usable names


## Done

Merged as [PR #117](https://github.com/thindery/pantry-pal/pull/117) (`d70df3c`) and deployed to OVH. Frontend container build id: `d70df3c`. CI: gitleaks, quality, test, postgres-integration, and e2e-smoke all passed.

### Data repair (2026-11-25)

Backup: `/opt/pantry-pal/backups/pp181-pre-junk-name-repair-20261125-2111.sql`. No rows deleted.

- `810035212374` cache already had the UPCitemdb title from a lookup at 2:58 PM CT (America/Chicago) when the item was opened. Left as-is.
- That user's pantry item was removed from the pantry at 2:59 PM CT the same day (`removed_from_pantry`). Not recreated.
- `070038626039` cache still named "F": Open Food Facts and UPCitemdb have no record, so it was left alone. After this deploy, a scan asks for a name instead of treating "F" as a known product.
- Other junk names: 0 pantry items with 1–2 character names; 1 remaining junk cache row (`F`). Activity history still shows "P" (3 rows) and "F" (5 rows).
